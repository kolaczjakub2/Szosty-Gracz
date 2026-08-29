import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { uniqueArticles } from '../../utils/article-collections';
import { ArchiveCard } from '../archive-card/archive-card';
import { ArchivePagination } from '../archive-pagination/archive-pagination';
import { HomePromos } from '../home-promos/home-promos';
import { RandomArchiveSection } from '../random-archive-section/random-archive-section';

@Component({
  selector: 'app-latest-panel',
  imports: [ArchiveCard, ArchivePagination, HomePromos, RandomArchiveSection],
  templateUrl: './latest-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestPanel {
  readonly title = input.required<string>();
  readonly articles = input.required<readonly Article[]>();
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pages = input.required<readonly number[]>();
  readonly showPromos = input(false);
  readonly showRandomArchive = input(true);
  readonly randomArticles = input<readonly Article[]>([]);
  readonly randomLoading = input(false);
  readonly randomError = input(false);
  readonly uniqueDisplayArticles = computed(() => uniqueArticles(this.articles()));
  readonly articlesBeforeRandom = computed(() => this.uniqueDisplayArticles().slice(0, 4));
  readonly articlesAfterRandom = computed(() => this.uniqueDisplayArticles().slice(4));
  readonly articleOpened = output<Article>();
  readonly pageSelected = output<number>();
  readonly randomRequested = output<void>();
}
