import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, startWith } from 'rxjs';

import { ArticleDetailViewModel, HomeViewModel, PaginatedArticles } from '../models/wordpress';
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

  getHomeViewModel(feed: SelectedFeed, page: number): Observable<HomeViewModel> {
    return this.getPostsForFeed(feed, page).pipe(
      map((result) => composeHomeViewModel(result)),
      startWith(createLoadingHomeViewModel(page)),
      catchError(() => of(createErrorHomeViewModel(page))),
    );
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
    if (feed.type === 'tag') {
      return this.wordpress.getPostsByTag(feed.tag, page);
    }

    if (feed.type === 'category') {
      return this.wordpress.getPostsByCategory(feed.category, page);
    }

    if (feed.type === 'team') {
      return this.wordpress.getPostsByTeamTag(feed.team.name, page);
    }

    return this.wordpress.getLatestPosts(page);
  }
}
