import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Article } from '../../models/wordpress';

@Component({
  selector: 'app-lead-carousel',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './lead-carousel.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadCarousel {
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
