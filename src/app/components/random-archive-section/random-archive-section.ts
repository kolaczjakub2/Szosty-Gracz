import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { ArchiveCard } from '../archive-card/archive-card';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-random-archive-section',
  imports: [ArchiveCard, UiIcon],
  templateUrl: './random-archive-section.html',
  styleUrl: './random-archive-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RandomArchiveSection {
  readonly articles = input.required<readonly Article[]>();
  readonly loading = input(false);
  readonly error = input(false);
  readonly articleOpened = output<Article>();
  readonly randomRequested = output<void>();
}
