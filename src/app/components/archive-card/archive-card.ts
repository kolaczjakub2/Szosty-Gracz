import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { articlePath } from '../../utils/article-route';
import { optimizedImageSrcset, optimizedImageUrl } from '../../utils/image-url';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-archive-card',
  imports: [DatePipe, UiIcon],
  templateUrl: './archive-card.html',
  styles: [':host { display: block; min-width: 0; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveCard {
  readonly articlePath = articlePath;
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly optimizedImageSrcset = optimizedImageSrcset;
  readonly article = input.required<Article>();
  readonly articleOpened = output<Article>();
}
