import { createCheerioRouter, Dataset, log } from 'crawlee';
import {
    extractRscPayload,
    extractDailyExploreData,
    extractEngagementData,
    extractStatsData,
    extractGithubTrendingFromDOM,
    extractDevelopersFromDOM,
} from './extractors.js';
import type { Input } from './types.js';

export const router = createCheerioRouter();

/**
 * Filters results by programming language (case-insensitive).
 */
function filterByLanguage<T extends Record<string, any>>(items: T[], language?: string): T[] {
    if (!language) return items;
    const lang = language.toLowerCase();
    return items.filter((item) => {
        const itemLang = item.repository_language || item.language || '';
        return itemLang.toLowerCase() === lang;
    });
}

router.addDefaultHandler(async ({ request, $ }) => {
    const { mode, language, engagementMetric } = request.userData as Input;

    log.info(`Processing ${mode} page: ${request.url}`);

    switch (mode) {
        case 'dailyExplore': {
            const payload = extractRscPayload($);
            let items = extractDailyExploreData(payload);
            items = filterByLanguage(items, language);
            log.info(`Extracted ${items.length} daily explore items`);
            await Dataset.pushData(items);
            break;
        }

        case 'repositoryEngagements': {
            const payload = extractRscPayload($);
            let items = extractEngagementData(payload, engagementMetric);
            items = filterByLanguage(items, language);
            log.info(`Extracted ${items.length} engagement items`);
            await Dataset.pushData(items);
            break;
        }

        case 'stats': {
            const payload = extractRscPayload($);
            let items = extractStatsData(payload);
            items = filterByLanguage(items, language);
            log.info(`Extracted ${items.length} stats items`);
            await Dataset.pushData(items);
            break;
        }

        case 'githubTrending': {
            let items = extractGithubTrendingFromDOM($);

            // Fallback to RSC payload if DOM yields nothing
            if (items.length === 0) {
                log.warning('DOM extraction yielded no results, trying RSC payload...');
                const payload = extractRscPayload($);
                // Try to find repo objects in RSC payload
                const rscItems = extractDailyExploreData(payload);
                if (rscItems.length > 0) {
                    const mapped = rscItems.map((item, idx) => ({
                        rank: item.rank || idx + 1,
                        full_name: item.full_name,
                        description: item.repository_description || '',
                        language: item.repository_language || '',
                        language_color: '',
                        stars: String(item.repository_stars || ''),
                        forks: String(item.repository_forks || ''),
                        trending_count: 0,
                        github_url: `https://github.com/${item.full_name}`,
                        trendshift_url: '',
                    }));
                    items = mapped;
                }
            }

            items = filterByLanguage(items, language) as typeof items;
            log.info(`Extracted ${items.length} GitHub trending items`);
            await Dataset.pushData(items);
            break;
        }

        case 'trendingDevelopers': {
            const items = extractDevelopersFromDOM($);
            log.info(`Extracted ${items.length} trending developer items`);
            await Dataset.pushData(items);
            break;
        }

        default:
            log.error(`Unknown mode: ${mode}`);
    }
});
