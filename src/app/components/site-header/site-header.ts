import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { NavItem, TeamFilter } from '../../models/ui';

@Component({
  selector: 'app-site-header',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './site-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly logoUrl = input.required<string>();
  readonly navItems = input.required<readonly NavItem[]>();
  readonly teams = input.required<readonly TeamFilter[]>();
  readonly selectedTeam = input<TeamFilter | null>(null);
  readonly activeNavItemKey = input<string | null>(null);
  readonly allFeedSelected = input(false);

  readonly homeSelected = output<void>();
  readonly navItemSelected = output<NavItem>();
  readonly teamSelected = output<TeamFilter>();
  readonly filterCleared = output<void>();

  navItemKey(item: NavItem): string {
    return `${item.taxonomy}:${item.slug}`;
  }
}
