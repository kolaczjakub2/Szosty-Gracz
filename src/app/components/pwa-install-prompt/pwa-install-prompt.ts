import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PwaInstallService } from '../../services/pwa-install';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-pwa-install-prompt',
  imports: [UiIcon],
  templateUrl: './pwa-install-prompt.html',
  styleUrl: './pwa-install-prompt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallPrompt {
  readonly pwa = inject(PwaInstallService);
}
