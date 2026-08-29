import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { TeamFilter } from '../models/ui';
import { Article, ArticleTag, ArticleTerm } from '../models/wordpress';
import { labelFromSlug } from '../utils/feed-view-model';

export interface InitialFeedUrlState {
  query: string;
  team: TeamFilter | null;
  tag: ArticleTag | null;
  category: ArticleTerm | null;
  postId: number | null;
  archivePage: number;
}

interface FeedSelectionParams {
  team?: TeamFilter | null;
  tag?: ArticleTag | null;
  category?: ArticleTerm | null;
}

@Injectable({ providedIn: 'root' })
export class FeedUrlState {
  private readonly router = inject(Router);

  readCurrentState(teams: readonly TeamFilter[]): InitialFeedUrlState {
    const route = this.deepestRoute(this.router.routerState.snapshot.root);
    const queryParams = route.queryParamMap;
    const teamCode = queryParams.get('team');
    const tagSlug = queryParams.get('tag');
    const categorySlug = queryParams.get('category');
    const postId = Number(route.paramMap.get('id'));
    const archivePage = Number(queryParams.get('page'));

    return {
      query: queryParams.get('q')?.trim() ?? '',
      team: teams.find((item) => item.code === teamCode) ?? null,
      tag: tagSlug
        ? {
            id: 0,
            name: labelFromSlug(tagSlug),
            slug: tagSlug,
            taxonomy: 'post_tag',
          }
        : null,
      category: categorySlug
        ? {
            id: 0,
            name: labelFromSlug(categorySlug),
            slug: categorySlug,
            taxonomy: 'category',
          }
        : null,
      postId: Number.isInteger(postId) && postId > 0 ? postId : null,
      archivePage: Number.isInteger(archivePage) && archivePage > 1 ? archivePage : 1,
    };
  }

  replaceFeedSelection(selection: FeedSelectionParams): void {
    void this.router.navigate(['/'], {
      queryParams: {
        team: selection.team?.code ?? null,
        tag: selection.tag?.slug ?? null,
        category: selection.category?.slug ?? null,
      },
      replaceUrl: true,
    });
  }

  setSearch(query: string | null): void {
    void this.router.navigate(['/'], {
      queryParams: { q: query?.trim() || null },
      replaceUrl: true,
    });
  }

  openArticle(article: Article): void {
    void this.router.navigate(['/artykul', article.id, article.slug], {
      queryParamsHandling: 'preserve',
    });
  }

  closeArticle(): void {
    void this.router.navigate(['/'], { queryParamsHandling: 'preserve' });
  }

  setPage(page: number | null): void {
    void this.router.navigate(['/'], {
      queryParams: { page: page && page > 1 ? page : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private deepestRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = route;

    while (current.firstChild) {
      current = current.firstChild;
    }

    return current;
  }
}
