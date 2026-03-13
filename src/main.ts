import { Actor, log } from 'apify';
import { CheerioCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';
import { BASE_URL, MODE_PATHS } from './constants.js';
import type { Input } from './types.js';

await Actor.init();

const input = await Actor.getInput<Input>() ?? {} as Input;
const {
    mode = 'dailyExplore',
    language,
    engagementMetric = 'stars',
    year,
    month,
    maxPages = 1,
    proxyConfiguration: proxyConfig,
} = input;

log.info(`Starting TrendShift scraper in "${mode}" mode`, { language, engagementMetric, year, month, maxPages });

// Validate mode
const basePath = MODE_PATHS[mode];
if (!basePath) {
    throw new Error(`Invalid mode: "${mode}". Valid modes: ${Object.keys(MODE_PATHS).join(', ')}`);
}

// Build URLs for all pages
const urls: string[] = [];
for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams();

    // repositoryEngagements respects year/month server-side
    if (mode === 'repositoryEngagements') {
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
    }

    // Pagination
    if (page > 1) {
        params.set('page', String(page));
    }

    const queryString = params.toString();
    const url = `${BASE_URL}${basePath}${queryString ? '?' + queryString : ''}`;
    urls.push(url);
}

log.info(`Queuing ${urls.length} URL(s)`, { urls });

// Configure proxy
const proxyConfiguration = proxyConfig
    ? new ProxyConfiguration(proxyConfig as any)
    : undefined;

const crawler = new CheerioCrawler({
    proxyConfiguration,
    requestHandler: router,
    maxRequestsPerCrawl: urls.length + 10,
    requestHandlerTimeoutSecs: 60,
    additionalMimeTypes: ['application/json'],
});

// Add URLs with user data for the router
await crawler.addRequests(
    urls.map((url) => ({
        url,
        userData: { mode, language, engagementMetric },
    }))
);

await crawler.run();

log.info('TrendShift scraper finished.');
await Actor.exit();
