import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TeamFilter } from '../../models/ui';

@Component({
  selector: 'app-active-filter',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './active-filter.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveFilter {
  readonly team = input<TeamFilter | null>(null);
  readonly filterCleared = output<void>();
}
