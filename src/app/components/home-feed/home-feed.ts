import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Article, HomeViewModel } from '../../models/wordpress';
import { LatestPanel } from '../latest-panel/latest-panel';
import { LeadGrid } from '../lead-grid/lead-grid';
import { NewsTicker } from '../news-ticker/news-ticker';

@Component({
  selector: 'app-home-feed',
  imports: [
    LatestPanel,
    LeadGrid,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NewsTicker,
  ],
  templateUrl: './home-feed.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFeed {
  readonly leadViewModel = input.required<HomeViewModel>();
  readonly archiveViewModel = input.required<HomeViewModel>();
  readonly tickerLabel = input.required<string>();
  readonly archiveTitle = input.required<string>();
  readonly archivePages = input.required<readonly number[]>();

  readonly articleOpened = output<Article>();
  readonly pageSelected = output<number>();
  readonly filterCleared = output<void>();
}
