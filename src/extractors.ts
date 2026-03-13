// Use 'any' for CheerioAPI to avoid version conflicts between cheerio and crawlee's internal cheerio
type CheerioAPI = any;
import type {
    DailyExploreItem,
    GithubTrendingItem,
    TrendingDeveloperItem,
    RepositoryEngagementItem,
    StatsItem,
} from './types.js';

/**
 * Extracts and concatenates all RSC flight payload strings from self.__next_f.push() script tags.
 */
export function extractRscPayload($: CheerioAPI): string {
    const chunks: string[] = [];
    $('script').each((_: number, el: any) => {
        const text = $(el).html() || '';
        const match = text.match(/self\.__next_f\.push\(\[1,"(.*)"\]\)/s);
        if (match) {
            try {
                const unescaped = JSON.parse(`"${match[1]}"`);
                chunks.push(unescaped);
            } catch {
                chunks.push(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
            }
        }
    });
    return chunks.join('');
}

/**
 * Extracts a balanced JSON structure (object or array) starting at a given position.
 */
function extractBalanced(str: string, startIdx: number): string | null {
    const openChar = str[startIdx];
    const closeChar = openChar === '{' ? '}' : openChar === '[' ? ']' : null;
    if (!closeChar) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < str.length; i++) {
        const ch = str[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === openChar) depth++;
        else if (ch === closeChar) {
            depth--;
            if (depth === 0) return str.slice(startIdx, i + 1);
        }
    }
    return null;
}

/**
 * Finds the JSON value (object or array) after a specific key in the payload.
 * Searches for "key": followed by a JSON value.
 */
function findValueAfterKey(payload: string, key: string): string | null {
    const searchKey = `"${key}"`;
    const keyIdx = payload.indexOf(searchKey);
    if (keyIdx === -1) return null;

    // Find the colon after the key
    let i = keyIdx + searchKey.length;
    while (i < payload.length && payload[i] !== ':') i++;
    if (i >= payload.length) return null;
    i++; // skip colon

    // Skip whitespace
    while (i < payload.length && (payload[i] === ' ' || payload[i] === '\n')) i++;
    if (i >= payload.length) return null;

    return extractBalanced(payload, i);
}

/**
 * Finds all occurrences of a key and extracts the array value.
 */
function findAllArraysAfterKey(payload: string, key: string): unknown[][] {
    const searchKey = `"${key}"`;
    const results: unknown[][] = [];
    let searchFrom = 0;

    while (searchFrom < payload.length) {
        const keyIdx = payload.indexOf(searchKey, searchFrom);
        if (keyIdx === -1) break;

        let i = keyIdx + searchKey.length;
        while (i < payload.length && payload[i] !== ':') i++;
        if (i >= payload.length) break;
        i++;
        while (i < payload.length && (payload[i] === ' ' || payload[i] === '\n')) i++;

        if (payload[i] === '[') {
            const arrStr = extractBalanced(payload, i);
            if (arrStr) {
                try {
                    const arr = JSON.parse(arrStr);
                    if (Array.isArray(arr)) results.push(arr);
                } catch {
                    // skip
                }
            }
        }

        searchFrom = keyIdx + searchKey.length;
    }
    return results;
}

// ─── Daily Explore ──────────────────────────────────────────────────────────

export function extractDailyExploreData(payload: string): DailyExploreItem[] {
    // Find "initialData":[...] in the payload
    const arrStr = findValueAfterKey(payload, 'initialData');
    if (arrStr) {
        try {
            const arr = JSON.parse(arrStr);
            if (Array.isArray(arr)) {
                return arr.filter((item: any) =>
                    typeof item === 'object' && item !== null &&
                    'rank' in item && 'full_name' in item
                );
            }
        } catch {
            // Fall through to regex approach
        }
    }

    // Fallback: scan for individual objects with rank + score + full_name
    const results: DailyExploreItem[] = [];
    const pattern = /\{"id":\d+[^}]*"rank":\d+[^}]*"full_name":"[^"]+"/g;
    let match;
    while ((match = pattern.exec(payload)) !== null) {
        const jsonStr = extractBalanced(payload, match.index);
        if (jsonStr) {
            try {
                const obj = JSON.parse(jsonStr);
                if (obj.rank && obj.full_name) results.push(obj);
            } catch {
                // skip
            }
        }
    }
    return results;
}

// ─── Repository Engagements ─────────────────────────────────────────────────

export function extractEngagementData(payload: string, metric?: string): RepositoryEngagementItem[] {
    // Engagement data is in arrays keyed by metric name.
    // Try to find "initialData" first (similar to daily explore)
    let items: RepositoryEngagementItem[] = [];

    const arrStr = findValueAfterKey(payload, 'initialData');
    if (arrStr) {
        try {
            const arr = JSON.parse(arrStr);
            if (Array.isArray(arr) && arr.length > 0 && 'merged_prs' in (arr[0] || {})) {
                items = arr;
            }
        } catch {
            // Fall through
        }
    }

    // If no initialData with engagement fields, try to find arrays with engagement objects
    if (items.length === 0) {
        // Look for objects with merged_prs field
        const pattern = /\{"id":\d+[^}]*"merged_prs":\d+/g;
        let match;
        while ((match = pattern.exec(payload)) !== null) {
            const jsonStr = extractBalanced(payload, match.index);
            if (jsonStr) {
                try {
                    const obj = JSON.parse(jsonStr);
                    if (obj.merged_prs !== undefined) items.push(obj);
                } catch {
                    // skip
                }
            }
        }
    }

    // Sort by the requested metric descending
    if (metric && metric !== 'all') {
        const metricKey = metric === 'mergedPrs' ? 'merged_prs'
            : metric === 'closedIssues' ? 'closed_issues'
            : metric;
        items.sort((a: any, b: any) => (b[metricKey] || 0) - (a[metricKey] || 0));
    }

    return items;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export function extractStatsData(payload: string): StatsItem[] {
    // Look for initialMetricsByLanguage key
    const valueStr = findValueAfterKey(payload, 'initialMetricsByLanguage');
    if (valueStr) {
        try {
            const obj = JSON.parse(valueStr);
            // Structure might be { lang: [...] } or just [...]
            if (Array.isArray(obj)) return obj;
            for (const val of Object.values(obj)) {
                if (Array.isArray(val)) return val as StatsItem[];
            }
        } catch {
            // Fall through
        }
    }

    // Fallback: find individual stats objects
    const results: StatsItem[] = [];
    const pattern = /\{"language":"[^"]+","year":\d+/g;
    let match;
    while ((match = pattern.exec(payload)) !== null) {
        const jsonStr = extractBalanced(payload, match.index);
        if (jsonStr) {
            try {
                const obj = JSON.parse(jsonStr);
                if (obj.language && obj.stars !== undefined) results.push(obj);
            } catch {
                // skip
            }
        }
    }
    return results;
}

// ─── GitHub Trending (DOM) ──────────────────────────────────────────────────

export function extractGithubTrendingFromDOM($: CheerioAPI): GithubTrendingItem[] {
    const items: GithubTrendingItem[] = [];

    const cards = $('div.rounded-lg.border.border-gray-300.bg-white').toArray();

    cards.forEach((card: any, index: number) => {
        const $card = $(card);

        // Rank: from the rounded-full badge
        const rankText = $card.find('div.rounded-full').filter((_: number, el: any) => {
            return $(el).text().trim().match(/^\d+$/);
        }).first().text().trim();
        const rank = parseInt(rankText, 10) || (index + 1);

        // Repository name: from the link inside the card
        const repoLink = $card.find('a.font-medium').first();
        const fullName = repoLink.text().trim();
        const trendshiftPath = repoLink.attr('href') || '';

        if (!fullName) return;

        // Language: span with rounded-full + colored background, next to text
        const langDot = $card.find('span.rounded-full[style]').first();
        const langColor = langDot.attr('style') || '';
        const colorMatch = langColor.match(/background-?[Cc]olor:\s*([^"'\s;)]+)/);
        const language = langDot.parent().text().trim();

        // Stars and forks via stat containers
        const statDivs = $card.find('div.flex.items-center.gap-1');
        let stars = '';
        let forks = '';
        statDivs.each((i: number, el: any) => {
            const html = $(el).html() || '';
            const text = $(el).text().trim();
            if (html.includes('lucide-star') || html.includes('star')) {
                stars = text;
            } else if (html.includes('lucide-git-fork') || html.includes('fork')) {
                forks = text;
            }
        });

        // Trending count
        const cardText = $card.text();
        const trendMatch = cardText.match(/(\d+)\s*times?\s*of\s*all\s*days/i);
        const trendingCount = trendMatch ? parseInt(trendMatch[1], 10) : 0;

        // Description
        const description = $card.find('div.text-xs.leading-5').last().text().trim();

        // GitHub URL
        const githubLink = $card.find('a[href*="github.com"]').attr('href') || '';

        items.push({
            rank,
            full_name: fullName,
            description,
            language,
            language_color: colorMatch ? colorMatch[1] : '',
            stars,
            forks,
            trending_count: trendingCount,
            github_url: githubLink,
            trendshift_url: trendshiftPath ? `https://trendshift.io${trendshiftPath}` : '',
        });
    });

    return items;
}

// ─── Trending Developers (DOM) ──────────────────────────────────────────────

export function extractDevelopersFromDOM($: CheerioAPI): TrendingDeveloperItem[] {
    const items: TrendingDeveloperItem[] = [];

    const cards = $('div.rounded-lg.border.border-gray-300.bg-white').toArray();

    cards.forEach((card: any) => {
        const $card = $(card);

        const usernameLink = $card.find('a.font-medium').first();
        const username = usernameLink.text().trim();
        const trendshiftPath = usernameLink.attr('href') || '';

        if (!username) return;

        const avatarUrl = $card.find('img.rounded-full').attr('src') || '';

        const cardText = $card.text();
        const trendMatch = cardText.match(/(\d+)\s*times?\s*of\s*all\s*days/i);
        const trendingCount = trendMatch ? parseInt(trendMatch[1], 10) : 0;

        items.push({
            username,
            avatar_url: avatarUrl,
            trending_count: trendingCount,
            trendshift_url: trendshiftPath ? `https://trendshift.io${trendshiftPath}` : '',
        });
    });

    return items;
}
