import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NavItem, TeamFilter } from '../../models/ui';
import { ActiveFilter } from '../active-filter/active-filter';
import { HeaderNav } from '../header-nav/header-nav';
import { HeaderTopbar } from '../header-topbar/header-topbar';
import { TeamStrip } from '../team-strip/team-strip';

@Component({
  selector: 'app-site-header',
  imports: [ActiveFilter, HeaderNav, HeaderTopbar, TeamStrip],
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
}
