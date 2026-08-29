import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article, HomeViewModel } from '../../models/wordpress';
import { ArchiveCard } from '../archive-card/archive-card';
import { ArchivePagination } from '../archive-pagination/archive-pagination';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-search-results',
  imports: [ArchiveCard, ArchivePagination, UiIcon],
  templateUrl: './search-results.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResults {
  readonly query = input.required<string>();
  readonly viewModel = input.required<HomeViewModel>();
  readonly pages = input.required<readonly number[]>();
  readonly articleOpened = output<Article>();
  readonly pageSelected = output<number>();
  readonly searchCleared = output<void>();

  resultLabel(total: number): string {
    if (total === 1) return 'wynik';
    const lastTwo = total % 100;
    const last = total % 10;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'wyniki' : 'wyników';
  }
}
