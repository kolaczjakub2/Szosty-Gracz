import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Article, HomeViewModel } from '../../models/wordpress';
import { excludeArticles, uniqueArticles } from '../../utils/article-collections';
import { LatestPanel } from '../latest-panel/latest-panel';
import { LeadGrid } from '../lead-grid/lead-grid';
import { HomePromos } from '../home-promos/home-promos';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-home-feed',
  imports: [
    LatestPanel,
    LeadGrid,
    HomePromos,
    UiIcon,
  ],
  templateUrl: './home-feed.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFeed {
  readonly leadViewModel = input.required<HomeViewModel>();
  readonly archiveViewModel = input.required<HomeViewModel>();
  readonly archiveTitle = input.required<string>();
  readonly archivePages = input.required<readonly number[]>();
  readonly showFeatured = input(true);
  readonly showRandomArchive = input(true);
  readonly randomArchiveArticles = input<readonly Article[]>([]);
  readonly randomArchiveLoading = input(false);
  readonly randomArchiveError = input(false);

  readonly featuredArticles = computed(() => {
    const viewModel = this.leadViewModel();

    return uniqueArticles([
      ...(viewModel.hero ? [viewModel.hero] : []),
      ...viewModel.sideArticles,
    ]).slice(0, 4);
  });

  readonly archiveArticles = computed(() =>
    excludeArticles(this.archiveViewModel().posts, this.featuredArticles()),
  );

  readonly articleOpened = output<Article>();
  readonly pageSelected = output<number>();
  readonly filterCleared = output<void>();
  readonly randomArchiveRequested = output<void>();
}
