# TrendShift.io Scraper

Scrapes trending GitHub repository and developer data from [trendshift.io](https://trendshift.io). TrendShift offers curated trending data using an engagement-based scoring algorithm that differs from GitHub's native trending page.

## What data can you extract?

This scraper supports five modes:

| Mode | Description | Output per page |
|------|-------------|-----------------|
| **Daily Explore** | Top repositories ranked by daily engagement score | ~25 repos |
| **GitHub Trending** | Repositories ranked by total GitHub Trending appearances | ~25 repos |
| **Trending Developers** | Developers ranked by trending frequency | ~25 developers |
| **Repository Engagements** | Monthly stars, forks, merged PRs, issues per repository | ~50 repos |
| **Language Stats** | Monthly stars and forks aggregated by programming language | ~3-12 entries |

## Input parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| **mode** | Yes | Which section to scrape: `dailyExplore`, `githubTrending`, `trendingDevelopers`, `repositoryEngagements`, or `stats` |
| **language** | No | Filter results by programming language (e.g., `Python`, `TypeScript`). Works across all modes. |
| **engagementMetric** | No | Sort engagement results by: `stars`, `forks`, `mergedPrs`, `issues`, `closedIssues`, or `all`. Only used in `repositoryEngagements` mode. |
| **year** | No | Year for engagement data (e.g., `2026`). Used by `repositoryEngagements` mode. |
| **month** | No | Month for engagement data (1-12). Used by `repositoryEngagements` mode. |
| **maxPages** | No | Number of pages to scrape (default: 1). Each page returns ~25 results. |
| **proxyConfiguration** | No | Proxy settings for anti-blocking. |

## Example inputs

**Daily trending repositories:**
```json
{
    "mode": "dailyExplore"
}
```

**Python repositories only:**
```json
{
    "mode": "dailyExplore",
    "language": "Python"
}
```

**Monthly engagement data for March 2026:**
```json
{
    "mode": "repositoryEngagements",
    "year": 2026,
    "month": 3
}
```

**Top GitHub trending repos, 3 pages:**
```json
{
    "mode": "githubTrending",
    "maxPages": 3
}
```

## Output examples

**Daily Explore:**
```json
{
    "rank": 1,
    "score": 23393,
    "full_name": "owner/repo-name",
    "repository_language": "Shell",
    "repository_stars": 29835,
    "repository_forks": 4684,
    "repository_description": "Repository description...",
    "date": "2026-03-12T00:00:00Z",
    "repository_created_at": "2025-10-13T12:12:29Z"
}
```

**GitHub Trending:**
```json
{
    "rank": 1,
    "full_name": "owner/repo-name",
    "language": "Markdown",
    "stars": "474.5k",
    "forks": "44.5k",
    "trending_count": 117,
    "description": "Repository description...",
    "github_url": "https://github.com/owner/repo-name"
}
```

**Trending Developers:**
```json
{
    "username": "developer-name",
    "trending_count": 277,
    "avatar_url": "https://avatars.githubusercontent.com/...",
    "trendshift_url": "https://trendshift.io/developers/4"
}
```

**Repository Engagements:**
```json
{
    "repository_name": "owner/repo-name",
    "repository_language": "TypeScript",
    "year": 2026,
    "month": 3,
    "stars": 69843,
    "forks": 12513,
    "merged_prs": 110,
    "issues": 16033,
    "closed_issues": 10967,
    "repository_stars": 303705,
    "repository_forks": 57383
}
```

**Language Stats:**
```json
{
    "language": "Python",
    "year": 2026,
    "month": 1,
    "stars": 675990,
    "forks": 101338
}
```

## Limitations

- **Daily Explore** shows only today's trends. There is no date parameter for historical data.
- **Language Stats** returns data for Python only in the default server-rendered response. Other languages require client-side rendering which is not supported.
- The **language filter** is applied after extraction for most modes since the server ignores the language query parameter. The exception is `repositoryEngagements`, where `year` and `month` are server-side parameters.
