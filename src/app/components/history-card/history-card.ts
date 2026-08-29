import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { articlePath } from '../../utils/article-route';
import { optimizedImageSrcset, optimizedImageUrl } from '../../utils/image-url';
import { UiIcon } from '../ui-icon/ui-icon';

export type HistoryCardVariant = 'lead' | 'side' | 'feature' | 'tile' | 'compact' | 'wide';

@Component({
  selector: 'app-history-card',
  imports: [DatePipe, UiIcon],
  templateUrl: './history-card.html',
  styleUrl: './history-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryCard {
  readonly articlePath = articlePath;
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly optimizedImageSrcset = optimizedImageSrcset;
  readonly article = input.required<Article>();
  readonly variant = input<HistoryCardVariant>('tile');
  readonly articleOpened = output<Article>();
}
