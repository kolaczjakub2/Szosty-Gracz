import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TeamFilter } from '../../models/ui';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-active-filter',
  imports: [UiIcon],
  templateUrl: './active-filter.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveFilter {
  readonly team = input<TeamFilter | null>(null);
  readonly filterCleared = output<void>();
}
