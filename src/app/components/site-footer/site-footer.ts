import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { optimizedImageUrl } from '../../utils/image-url';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, UiIcon],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  readonly currentYear = new Date().getFullYear();
  readonly logoUrl = input.required<string>();
  readonly optimizedImageUrl = optimizedImageUrl;

  readonly homeSelected = output<void>();
  readonly accountSelected = output<void>();
  readonly cookieSettingsSelected = output<void>();
}
