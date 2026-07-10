import { Injectable } from '@angular/core';

import { ArticleTag, ArticleTerm } from '../models/wordpress';
import { TeamFilter } from '../models/ui';
import { labelFromSlug } from '../utils/feed-view-model';

export interface InitialFeedUrlState {
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

@Injectable({
  providedIn: 'root',
})
export class FeedUrlState {
  readInitialState(teams: readonly TeamFilter[]): InitialFeedUrlState {
    const params = new URLSearchParams(window.location.search);
    const teamCode = params.get('team');
    const tagSlug = params.get('tag');
    const categorySlug = params.get('category');
    const postId = Number(params.get('post'));
    const archivePage = Number(params.get('page'));

    return {
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
    const url = new URL(window.location.href);

    this.setOptionalParam(url, 'team', selection.team?.code ?? null);
    this.setOptionalParam(url, 'tag', selection.tag?.slug ?? null);
    this.setOptionalParam(url, 'category', selection.category?.slug ?? null);
    this.setOptionalParam(url, 'post', null);
    this.setOptionalParam(url, 'page', null);
    this.replaceUrl(url);
  }

  setPost(postId: number | null): void {
    this.updateParam('post', postId ? postId.toString() : null);
  }

  setPage(page: number | null): void {
    this.updateParam('page', page && page > 1 ? page.toString() : null);
  }

  private updateParam(name: string, value: string | null): void {
    const url = new URL(window.location.href);
    this.setOptionalParam(url, name, value);
    this.replaceUrl(url);
  }

  private setOptionalParam(url: URL, name: string, value: string | null): void {
    if (value) {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
  }

  private replaceUrl(url: URL): void {
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
}
