import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ThemeService } from '../../services/theme';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-theme-toggle',
  imports: [UiIcon],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  readonly compact = input(false);
  readonly theme = inject(ThemeService);
}
