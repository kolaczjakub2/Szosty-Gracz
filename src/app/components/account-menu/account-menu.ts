import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-account-menu',
  imports: [RouterLink, UiIcon],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  readonly auth = inject(AuthService);
  readonly compact = input(false);

  logout(menu: HTMLDetailsElement): void {
    menu.open = false;
    this.auth.logout();
  }
}
