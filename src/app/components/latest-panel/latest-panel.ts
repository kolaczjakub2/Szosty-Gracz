import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { Article } from '../../models/wordpress';

@Component({
  selector: 'app-latest-panel',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule],
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
