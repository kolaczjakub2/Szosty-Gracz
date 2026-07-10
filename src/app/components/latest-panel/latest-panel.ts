import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { Article } from '../../models/wordpress';
import { ArchiveCard } from '../archive-card/archive-card';
import { ArchivePagination } from '../archive-pagination/archive-pagination';

@Component({
  selector: 'app-latest-panel',
  imports: [ArchiveCard, ArchivePagination, MatCardModule],
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
  readonly articleOpened = output<Article>();
  readonly pageSelected = output<number>();
}
