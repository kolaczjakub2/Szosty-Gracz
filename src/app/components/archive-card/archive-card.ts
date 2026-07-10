import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Article } from '../../models/wordpress';

@Component({
  selector: 'app-archive-card',
  imports: [DatePipe, MatIconModule],
  templateUrl: './archive-card.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveCard {
  readonly article = input.required<Article>();
  readonly articleOpened = output<Article>();
}
