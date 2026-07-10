import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { NavItem } from '../../models/ui';

@Component({
  selector: 'app-header-nav',
  imports: [MatButtonModule],
  templateUrl: './header-nav.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderNav {
  readonly navItems = input.required<readonly NavItem[]>();
  readonly activeNavItemKey = input<string | null>(null);
  readonly navItemSelected = output<NavItem>();

  navItemKey(item: NavItem): string {
    return `${item.taxonomy}:${item.slug}`;
  }
}
