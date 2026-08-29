import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import {
  Article,
  ArticleComment,
  ArticleDetailViewModel,
  HomeViewModel,
  PaginatedArticles,
} from '../models/wordpress';
import {
  SelectedFeed,
  composeHomeViewModel,
  createEmptyArticleDetailViewModel,
  createErrorArticleDetailViewModel,
  createErrorHomeViewModel,
  createLoadingArticleDetailViewModel,
  createLoadingHomeViewModel,
} from '../utils/feed-view-model';
import { Wordpress } from './wordpress';

@Injectable({
  providedIn: 'root',
})
export class ArticleFeed {
  private readonly wordpress = inject(Wordpress);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly homeViewModelCache = new Map<string, Observable<HomeViewModel>>();
  private readonly feedCache = new Map<string, Observable<PaginatedArticles>>();

  getFeaturedHomeViewModel(): Observable<HomeViewModel> {
    return this.getHomeViewModel(
      {
        type: 'category',
        category: {
          id: 3474,
          name: 'Featured',
          slug: 'featured',
          taxonomy: 'category',
        },
      },
      1,
    );
  }

  getHomeViewModel(feed: SelectedFeed, page: number): Observable<HomeViewModel> {
    const cacheKey = this.feedCacheKey(feed, page);
    const isLatestLandingPage = feed.type === 'latest' && page === 1;
    const cached = isLatestLandingPage ? null : this.homeViewModelCache.get(cacheKey);

    if (cached) return cached;

    const stateKey = makeStateKey<HomeViewModel>(`home-feed:${cacheKey}`);
    const transferred = this.transferState.get<HomeViewModel | null>(stateKey, null);
    let request$: Observable<HomeViewModel>;

    if (transferred) {
      this.transferState.remove(stateKey);
      request$ = of({
        ...transferred,
        posts: transferred.posts.map((article) => this.restoreTransferredArticle(article)),
        hero: transferred.hero
          ? this.restoreTransferredArticle(transferred.hero)
          : undefined,
        sideArticles: transferred.sideArticles.map((article) =>
          this.restoreTransferredArticle(article),
        ),
        latest: transferred.latest.map((article) => this.restoreTransferredArticle(article)),
      });
    } else {
      request$ = this.getPostsForFeed(feed, page).pipe(
        map((result) => composeHomeViewModel(result)),
        tap((viewModel) => {
          if (isPlatformServer(this.platformId)) this.transferState.set(stateKey, viewModel);
        }),
        startWith(createLoadingHomeViewModel(page)),
        catchError(() => of(createErrorHomeViewModel(page))),
      );
    }

    const shared = request$.pipe(shareReplay({ bufferSize: 1, refCount: false }));
    if (!isLatestLandingPage) this.homeViewModelCache.set(cacheKey, shared);
    return shared;
  }

  getRandomArchivePosts(count = 4): Observable<Article[]> {
    return this.wordpress.getRandomArchivePosts(count).pipe(catchError(() => of([])));
  }

  getArticleDetailViewModel(postId: number | null): Observable<ArticleDetailViewModel> {
    if (!postId) {
      return of(createEmptyArticleDetailViewModel());
    }

    const stateKey = makeStateKey<ArticleDetailViewModel>(`article-detail:${postId}`);
    const transferred = this.transferState.get<ArticleDetailViewModel | null>(stateKey, null);

    if (transferred) {
      this.transferState.remove(stateKey);
      return of({
        ...transferred,
        article: transferred.article
          ? this.restoreTransferredArticle(transferred.article)
          : undefined,
        comments: transferred.comments.map((comment) =>
          this.restoreTransferredComment(comment),
        ),
        relatedArticles: (transferred.relatedArticles ?? []).map((article) =>
          this.restoreTransferredArticle(article),
        ),
        authorArticles: (transferred.authorArticles ?? []).map((article) =>
          this.restoreTransferredArticle(article),
        ),
      });
    }

    return forkJoin({
      article: this.wordpress.getPostDetail(postId),
      comments: this.wordpress.getCommentsByPost(postId).pipe(catchError(() => of([]))),
    }).pipe(
      switchMap(({ article, comments }) =>
        forkJoin({
          relatedArticles: this.wordpress
            .getRelatedPosts(article.tags, article.id, 3)
            .pipe(catchError(() => of([]))),
          authorCandidates: article.authorSlug
            ? this.wordpress.getPostsByArchiveAuthor(article.authorSlug, 1).pipe(
                map((result) => result.articles.filter((item) => item.id !== article.id)),
                catchError(() => of([])),
              )
            : of([]),
        }).pipe(
          map(({ relatedArticles, authorCandidates }) => {
            const relatedIds = new Set(relatedArticles.map((item) => item.id));
            return {
              loading: false,
              article,
              comments,
              commentCount: comments.length,
              relatedArticles,
              authorArticles: authorCandidates
                .filter((item) => !relatedIds.has(item.id))
                .slice(0, 3),
            };
          }),
        ),
      ),
      tap((viewModel) => {
        if (isPlatformServer(this.platformId)) this.transferState.set(stateKey, viewModel);
      }),
      startWith(createLoadingArticleDetailViewModel()),
      catchError(() => of(createErrorArticleDetailViewModel())),
    );
  }

  private getPostsForFeed(feed: SelectedFeed, page: number): Observable<PaginatedArticles> {
    const bypassCache = feed.type === 'latest' && page === 1;
    const cacheKey = this.feedCacheKey(feed, page);
    const cached = bypassCache ? null : this.feedCache.get(cacheKey);

    if (cached) return cached;

    let request: Observable<PaginatedArticles>;

    if (feed.type === 'search') {
      request = this.wordpress.searchPosts(feed.query, page);
    } else if (feed.type === 'tag') {
      request = this.wordpress.getPostsByTag(feed.tag, page);
    } else if (feed.type === 'category') {
      request = this.wordpress.getPostsByCategory(feed.category, page);
    } else if (feed.type === 'team') {
      request = this.wordpress.getPostsByTeamTag(feed.team.name, page);
    } else {
      request = this.wordpress.getLatestPosts(page);
    }

    if (bypassCache) return request;

    const shared = request.pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.feedCache.set(cacheKey, shared);
    return shared;
  }

  private feedCacheKey(feed: SelectedFeed, page: number): string {
    const selection = 'query' in feed
      ? feed.query.toLocaleLowerCase('pl-PL')
      : 'tag' in feed
      ? feed.tag.id
      : 'category' in feed
        ? feed.category.id
        : 'team' in feed
          ? feed.team.name
          : 'all';

    return `${feed.type}:${selection}:${page}`;
  }

  private restoreTransferredArticle<T extends Article>(article: T): T {
    return {
      ...article,
      date: this.restoreWordpressLocalDate(article.date),
    };
  }

  private restoreTransferredComment(comment: ArticleComment): ArticleComment {
    return {
      ...comment,
      date: this.restoreWordpressLocalDate(comment.date),
    };
  }

  private restoreWordpressLocalDate(value: Date): Date {
    if (value instanceof Date) return value;

    const serialized = String(value);
    return new Date(serialized.endsWith('Z') ? serialized.slice(0, -1) : serialized);
  }
}
