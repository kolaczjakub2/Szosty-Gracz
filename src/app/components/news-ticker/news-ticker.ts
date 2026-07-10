import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';

@Component({
  selector: 'app-news-ticker',
  templateUrl: './news-ticker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsTicker {
  readonly label = input.required<string>();
  readonly articles = input.required<readonly Article[]>();
  readonly articleOpened = output<Article>();
}
