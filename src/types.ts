export interface Input {
    mode: 'dailyExplore' | 'githubTrending' | 'trendingDevelopers' | 'repositoryEngagements' | 'stats';
    language?: string;
    engagementMetric?: 'stars' | 'forks' | 'mergedPrs' | 'issues' | 'closedIssues' | 'all';
    year?: number;
    month?: number;
    maxPages?: number;
    proxyConfiguration?: object;
}

export interface DailyExploreItem {
    id: number;
    date: string;
    rank: number;
    score: number;
    full_name: string;
    repository_stars: number;
    repository_forks: number;
    repository_language: string;
    repository_description: string;
    repository_created_at: string;
}

export interface GithubTrendingItem {
    rank: number;
    full_name: string;
    description: string;
    language: string;
    language_color: string;
    stars: string;
    forks: string;
    trending_count: number;
    github_url: string;
    trendshift_url: string;
}

export interface TrendingDeveloperItem {
    username: string;
    avatar_url: string;
    trending_count: number;
    trendshift_url: string;
}

export interface RepositoryEngagementItem {
    id: number;
    year: number;
    month: number;
    stars: number;
    forks: number;
    merged_prs: number;
    issues: number;
    closed_issues: number;
    repository_id: number;
    repository_name: string;
    repository_stars: number;
    repository_forks: number;
    repository_language: string;
}

export interface StatsItem {
    language: string;
    year: number;
    month: number;
    stars: number;
    forks: number;
}
