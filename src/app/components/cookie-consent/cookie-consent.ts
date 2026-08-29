import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AnalyticsService } from '../../services/analytics';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-cookie-consent',
  imports: [UiIcon],
  templateUrl: './cookie-consent.html',
  styleUrl: './cookie-consent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsent {
  readonly analytics = inject(AnalyticsService);
  readonly detailsOpen = signal(false);
}
