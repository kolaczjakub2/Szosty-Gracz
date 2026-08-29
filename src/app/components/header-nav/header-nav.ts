import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NavItem } from '../../models/ui';

@Component({
  selector: 'app-header-nav',
  templateUrl: './header-nav.html',
  styles: [':host { display: block; min-height: 0; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderNav {
  readonly navItems = input.required<readonly NavItem[]>();
  readonly activeNavItemKey = input<string | null>(null);
  readonly navItemSelected = output<NavItem>();

  navItemKey(item: NavItem): string {
    return item.path ? `page:${item.path}` : `${item.taxonomy}:${item.slug}`;
  }

  navItemHref(item: NavItem): string {
    if (item.path) return item.path;
    const parameter = item.taxonomy === 'post_tag' ? 'tag' : 'category';
    return `/?${parameter}=${encodeURIComponent(item.slug)}`;
  }
}
