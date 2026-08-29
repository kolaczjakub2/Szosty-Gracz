import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountMenu } from '../account-menu/account-menu';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-header-topbar',
  imports: [AccountMenu, RouterLink, ThemeToggle, UiIcon],
  templateUrl: './header-topbar.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderTopbar {
}
