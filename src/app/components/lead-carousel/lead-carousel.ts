import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { articlePath } from '../../utils/article-route';
import { optimizedImageSrcset, optimizedImageUrl } from '../../utils/image-url';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-lead-carousel',
  imports: [DatePipe, UiIcon],
  templateUrl: './lead-carousel.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadCarousel {
  readonly articlePath = articlePath;
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly optimizedImageSrcset = optimizedImageSrcset;
  readonly article = input.required<Article>();
  readonly currentLabel = input.required<string>();
  readonly totalLabel = input.required<string>();
  readonly progressPercent = input.required<number>();

  readonly articleOpened = output<Article>();
  readonly previousSelected = output<void>();
  readonly nextSelected = output<void>();
  readonly autoplayPaused = output<void>();
  readonly autoplayResumed = output<void>();
}
