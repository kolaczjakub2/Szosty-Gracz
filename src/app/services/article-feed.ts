import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import {
  EMPTY,
  Observable,
  catchError,
  concat,
  forkJoin,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { Article, ArticleDetailViewModel, HomeViewModel, PaginatedArticles } from '../models/wordpress';
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

  getHomeViewModel(feed: SelectedFeed, page: number): Observable<HomeViewModel> {
    const cacheKey = this.feedCacheKey(feed, page);
    const cached = this.homeViewModelCache.get(cacheKey);

    if (cached) return cached;

    const stateKey = makeStateKey<HomeViewModel>(`home-feed:${cacheKey}`);
    const transferred = this.transferState.get<HomeViewModel | null>(stateKey, null);
    let request$: Observable<HomeViewModel>;

    if (transferred) {
      this.transferState.remove(stateKey);

      if (!isPlatformBrowser(this.platformId)) {
       request$ = of(transferred);
      } else {
       const refreshed = timer(30_000).pipe(
         switchMap(() => this.getPostsForFeed(feed, page)),
         map((result) => composeHomeViewModel(result)),
         catchError(() => EMPTY),
       );

       request$ = concat(of(transferred), refreshed);
      }
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
    this.homeViewModelCache.set(cacheKey, shared);
    return shared;
  }

  getRandomArchivePosts(count = 4): Observable<Article[]> {
    return this.wordpress.getRandomArchivePosts(count).pipe(catchError(() => of([])));
  }

  getArticleDetailViewModel(postId: number | null): Observable<ArticleDetailViewModel> {
    if (!postId) {
      return of(createEmptyArticleDetailViewModel());
    }

    return forkJoin({
      article: this.wordpress.getPostDetail(postId),
      comments: this.wordpress.getCommentsByPost(postId).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ article, comments }) => ({
        loading: false,
        article,
        comments,
        commentCount: comments.length,
      })),
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

    if (feed.type === 'tag') {
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
    const selection = 'tag' in feed
      ? feed.tag.id
      : 'category' in feed
        ? feed.category.id
        : 'team' in feed
          ? feed.team.name
          : 'all';

    return `${feed.type}:${selection}:${page}`;
  }
}
