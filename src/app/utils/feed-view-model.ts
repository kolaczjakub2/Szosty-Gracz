import {
  ArticleDetailViewModel,
  ArticleTag,
  ArticleTerm,
  HomeViewModel,
  PaginatedArticles,
} from '../models/wordpress';
import { TeamFilter } from '../models/ui';

export type SelectedFeed =
  | { type: 'search'; query: string }
  | { type: 'tag'; tag: ArticleTag }
  | { type: 'category'; category: ArticleTerm }
  | { type: 'team'; team: TeamFilter }
  | { type: 'latest' };

export interface ArchiveRequest {
  feed: SelectedFeed;
  page: number;
}

export function createLoadingHomeViewModel(page = 1): HomeViewModel {
  return {
    loading: true,
    posts: [],
    sideArticles: [],
    latest: [],
    total: 0,
    totalPages: 0,
    page,
  };
}

export function createErrorHomeViewModel(page = 1): HomeViewModel {
  return {
    loading: false,
    error: 'Nie uda\u0142o si\u0119 pobra\u0107 wpis\u00f3w z WordPress API.',
    posts: [],
    sideArticles: [],
    latest: [],
    total: 0,
    totalPages: 0,
    page,
  };
}

export function createEmptyArticleDetailViewModel(): ArticleDetailViewModel {
  return {
    loading: false,
    comments: [],
    commentCount: 0,
    relatedArticles: [],
    authorArticles: [],
  };
}

export function createLoadingArticleDetailViewModel(): ArticleDetailViewModel {
  return {
    loading: true,
    comments: [],
    commentCount: 0,
    relatedArticles: [],
    authorArticles: [],
  };
}

export function createErrorArticleDetailViewModel(): ArticleDetailViewModel {
  return {
    loading: false,
    error: 'Nie uda\u0142o si\u0119 pobra\u0107 tego wpisu.',
    comments: [],
    commentCount: 0,
    relatedArticles: [],
    authorArticles: [],
  };
}

export function composeHomeViewModel(result: PaginatedArticles): HomeViewModel {
  const posts = result.articles;

  return {
    loading: false,
    posts,
    hero: posts[0],
    sideArticles: posts.slice(1, 4),
    latest: posts.slice(0, 8),
    total: result.total,
    totalPages: result.totalPages,
    page: result.page,
  };
}

export function buildArchivePages(currentPage: number, totalPages: number): number[] {
  const safeTotal = Math.max(Math.floor(totalPages), 0);

  if (safeTotal <= 1) {
    return [];
  }

  const safeCurrent = Math.min(Math.max(Math.floor(currentPage), 1), safeTotal);
  const visiblePages = 7;
  const halfWindow = Math.floor(visiblePages / 2);
  let start = Math.max(safeCurrent - halfWindow, 1);
  const end = Math.min(start + visiblePages - 1, safeTotal);
  start = Math.max(end - visiblePages + 1, 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getFeedTitle(
  tag: ArticleTag | null,
  category: ArticleTerm | null,
  team: TeamFilter | null,
): string {
  return tag?.name ?? category?.name ?? team?.name ?? 'Najnowsze';
}

export function getActiveNavItemKey(
  tag: ArticleTag | null,
  category: ArticleTerm | null,
): string | null {
  if (tag) {
    return termKey(tag);
  }

  return category ? termKey(category) : null;
}

export function isAllFeedSelected(
  team: TeamFilter | null,
  tag: ArticleTag | null,
  category: ArticleTerm | null,
): boolean {
  return !team && !tag && !category;
}

export function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function termKey(term: Pick<ArticleTerm, 'slug' | 'taxonomy'>): string {
  return `${term.taxonomy}:${term.slug}`;
}
