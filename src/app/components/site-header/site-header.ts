import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavItem, TeamFilter } from '../../models/ui';
import { ActiveFilter } from '../active-filter/active-filter';
import { AccountMenu } from '../account-menu/account-menu';
import { HeaderNav } from '../header-nav/header-nav';
import { HeaderTopbar } from '../header-topbar/header-topbar';
import { TeamStrip } from '../team-strip/team-strip';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-site-header',
  imports: [AccountMenu, ActiveFilter, HeaderNav, HeaderTopbar, RouterLink, TeamStrip, ThemeToggle, UiIcon],
  templateUrl: './site-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly mobileMenuOpen = signal(false);
  readonly mobileTeamsOpen = signal(false);
  readonly stickyMode = signal(false);
  readonly searchOpen = signal(false);
  readonly logoUrl = input.required<string>();
  readonly navItems = input.required<readonly NavItem[]>();
  readonly teams = input.required<readonly TeamFilter[]>();
  readonly selectedTeam = input<TeamFilter | null>(null);
  readonly activeNavItemKey = input<string | null>(null);
  readonly allFeedSelected = input(false);
  readonly showTeamPanel = input(true);

  readonly homeSelected = output<void>();
  readonly navItemSelected = output<NavItem>();
  readonly teamSelected = output<TeamFilter>();
  readonly filterCleared = output<void>();
  readonly accountSelected = output<void>();
  readonly searchSubmitted = output<string>();

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;

      if (!view) {
        return;
      }

      const updateStickyMode = () => {
        const sticky = view.scrollY > 0;

        if (sticky) {
          this.mobileTeamsOpen.set(false);
        }

        this.stickyMode.set(sticky);
      };

      updateStickyMode();
      view.addEventListener('scroll', updateStickyMode, { passive: true });
      this.destroyRef.onDestroy(() => view.removeEventListener('scroll', updateStickyMode));
    });
  }

  selectNavItem(item: NavItem): void {
    this.mobileMenuOpen.set(false);
    this.navItemSelected.emit(item);
  }

  toggleMobileMenu(): void {
    this.searchOpen.set(false);
    this.mobileTeamsOpen.set(false);
    this.mobileMenuOpen.update((open) => !open);
  }

  toggleMobileTeams(): void {
    this.searchOpen.set(false);
    this.mobileMenuOpen.set(false);
    this.mobileTeamsOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }


  toggleSearch(): void {
    this.mobileMenuOpen.set(false);
    this.mobileTeamsOpen.set(false);
    this.searchOpen.update((open) => !open);
  }

  submitSearch(value: string): void {
    const query = value.trim();
    if (!query) return;
    this.searchOpen.set(false);
    this.searchSubmitted.emit(query);
  }
}
