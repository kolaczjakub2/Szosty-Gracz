import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, switchMap } from 'rxjs';

import { ArticleDetail } from './components/article-detail/article-detail';
import { AccountDialog } from './components/account-dialog/account-dialog';
import { HomeFeed } from './components/home-feed/home-feed';
import { CookieConsent } from './components/cookie-consent/cookie-consent';
import { PwaInstallPrompt } from './components/pwa-install-prompt/pwa-install-prompt';
import { ScrollTop } from './components/scroll-top/scroll-top';
import { SearchResults } from './components/search-results/search-results';
import { SiteFooter } from './components/site-footer/site-footer';
import { SiteHeader } from './components/site-header/site-header';
import { LOGO_URL, NAV_ITEMS, TEAMS } from './data/site-data';
import { NavItem, TeamFilter } from './models/ui';
import { Article, ArticleDetailViewModel, ArticleTag, ArticleTerm, HomeViewModel } from './models/wordpress';
import { ArticleFeed } from './services/article-feed';
import { AnalyticsService } from './services/analytics';
import { FeedUrlState } from './services/feed-url-state';
import { PushNotificationsService } from './services/push-notifications';
import { SeoService } from './services/seo';
import {
  ArchiveRequest,
  SelectedFeed,
  buildArchivePages,
  createEmptyArticleDetailViewModel,
  createLoadingHomeViewModel,
  getActiveNavItemKey,
  getFeedTitle,
  isAllFeedSelected,
} from './utils/feed-view-model';

interface FeedSelection {
  team?: TeamFilter | null;
  tag?: ArticleTag | null;
  category?: ArticleTerm | null;
}

@Component({
  selector: 'app-root',
  imports: [AccountDialog, ArticleDetail, CookieConsent, HomeFeed, PwaInstallPrompt, RouterOutlet, ScrollTop, SearchResults, SiteFooter, SiteHeader],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly analytics = inject(AnalyticsService);
  readonly pushNotifications = inject(PushNotificationsService);
  private readonly articleFeed = inject(ArticleFeed);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly urlState = inject(FeedUrlState);
  private shouldScrollToArchive = false;

  readonly logoUrl = LOGO_URL;
  readonly navItems = NAV_ITEMS;
  readonly teams = TEAMS;
  private readonly initialUrlState = this.urlState.readCurrentState(this.teams);
  readonly selectedTeam = signal<TeamFilter | null>(this.initialUrlState.team);
  readonly searchQuery = signal(this.initialUrlState.query);
  readonly selectedTag = signal<ArticleTag | null>(this.initialUrlState.tag);
  readonly selectedCategory = signal<ArticleTerm | null>(this.initialUrlState.category);
  readonly selectedPostId = signal<number | null>(this.initialUrlState.postId);
  readonly archivePage = signal(this.initialUrlState.archivePage);
  readonly accountOpen = signal(false);
  readonly randomArchiveArticles = signal<readonly Article[]>([]);
  readonly randomArchiveLoading = signal(false);
  readonly randomArchiveError = signal(false);
  readonly aboutPageOpen = signal(false);
  readonly authorPageOpen = signal(false);
  readonly supportPageOpen = signal(false);
  readonly matchAlertPageOpen = signal(false);
  readonly historyPageOpen = signal(false);
  readonly currentPath = signal('/');
  readonly accountPageOpen = signal(false);
  readonly accountProfilePageOpen = signal(false);
  readonly notFoundPageOpen = signal(false);
  readonly standalonePageOpen = computed(
    () =>
      this.aboutPageOpen() ||
      this.authorPageOpen() ||
      this.supportPageOpen() ||
      this.matchAlertPageOpen() ||
      this.historyPageOpen() ||
      this.accountPageOpen() ||
      this.accountProfilePageOpen() ||
      this.notFoundPageOpen(),
  );

  readonly selectedFeed = computed<SelectedFeed>(() => {
    const query = this.searchQuery();
    if (query) return { type: 'search', query };

    const tag = this.selectedTag();

    if (tag) {
      return { type: 'tag', tag };
    }

    const category = this.selectedCategory();

    if (category) {
      return { type: 'category', category };
    }

    const team = this.selectedTeam();

    if (team) {
      return { type: 'team', team };
    }

    return { type: 'latest' };
  });

  readonly selectedArchiveRequest = computed<ArchiveRequest>(() => ({
    feed: this.selectedFeed(),
    page: this.archivePage(),
  }));

  readonly leadViewModel = toSignal(this.articleFeed.getFeaturedHomeViewModel(), {
    initialValue: createLoadingHomeViewModel(),
  });

  readonly archiveViewModel = toSignal(
    toObservable(this.selectedArchiveRequest).pipe(
      switchMap(({ feed, page }) => this.articleFeed.getHomeViewModel(feed, page)),
    ),
    { initialValue: createLoadingHomeViewModel() },
  );

  readonly archivePages = computed(() =>
    buildArchivePages(this.archiveViewModel().page, this.archiveViewModel().totalPages),
  );

  readonly feedTitle = computed(() =>
    getFeedTitle(this.selectedTag(), this.selectedCategory(), this.selectedTeam()),
  );

  readonly activeNavItemKey = computed(() =>
    this.navItems.some((item) => item.path === this.currentPath())
      ? `page:${this.currentPath()}`
      : getActiveNavItemKey(this.selectedTag(), this.selectedCategory()),
  );

  readonly allFeedSelected = computed(() =>
    isAllFeedSelected(this.selectedTeam(), this.selectedTag(), this.selectedCategory()),
  );

  readonly archiveTitle = computed(() => `Archiwum: ${this.feedTitle()}`);

  readonly articleDetailViewModel = toSignal(
    toObservable(this.selectedPostId).pipe(
      switchMap((postId) => this.articleFeed.getArticleDetailViewModel(postId)),
    ),
    { initialValue: createEmptyArticleDetailViewModel() },
  );

  constructor() {
    this.syncUrlState();
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => this.observeRandomArchive());
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncUrlState());

    effect(() => {
      const archiveVm = this.archiveViewModel();

      if (
        !this.shouldScrollToArchive ||
        archiveVm.loading ||
        archiveVm.page !== this.archivePage()
      ) {
        return;
      }

      this.shouldScrollToArchive = false;
      this.scrollToArchiveSection();
    });

    effect(() =>
      this.updatePageMetadata(
        this.leadViewModel(),
        this.articleDetailViewModel(),
        this.aboutPageOpen(),
        this.authorPageOpen(),
        this.supportPageOpen(),
        this.matchAlertPageOpen(),
        this.historyPageOpen(),
        this.accountPageOpen(),
        this.accountProfilePageOpen(),
        this.notFoundPageOpen(),
      ),
    );
  }

  loadRandomArchive(): void {
    if (this.randomArchiveLoading()) return;
    this.randomArchiveError.set(false);
    this.randomArchiveLoading.set(true);
    this.articleFeed.getRandomArchivePosts(4).subscribe({
      next: (articles) => this.randomArchiveArticles.set(articles),
      error: () => {
        this.randomArchiveArticles.set([]);
        this.randomArchiveError.set(true);
        this.randomArchiveLoading.set(false);
      },
      complete: () => this.randomArchiveLoading.set(false),
    });
  }

  private observeRandomArchive(): void {
    const section = this.document.querySelector('.random-archive');
    const view = this.document.defaultView;

    if (!section || !view || !('IntersectionObserver' in view)) {
      view?.setTimeout(() => this.loadRandomArchive(), 5000);
      return;
    }

    let requested = false;
    let observer: IntersectionObserver | null = null;

    const requestArticles = () => {
      if (requested) return;
      requested = true;
      observer?.disconnect();
      view.removeEventListener('scroll', checkSectionPosition);
      this.loadRandomArchive();
    };

    const checkSectionPosition = () => {
      if (section.getBoundingClientRect().top <= view.innerHeight + 500) {
        requestArticles();
      }
    };

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestArticles();
        }
      },
      { rootMargin: '500px 0px' },
    );

    observer.observe(section);
    view.addEventListener('scroll', checkSectionPosition, { passive: true });
    checkSectionPosition();
    this.destroyRef.onDestroy(() => {
      observer?.disconnect();
      view.removeEventListener('scroll', checkSectionPosition);
    });
  }

  openArticle(article: Article): void {
    this.selectedPostId.set(article.id);
    this.urlState.openArticle(article);
    this.scrollToTop();
  }

  search(query: string): void {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;
    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.selectedTeam.set(null);
    this.selectedTag.set(null);
    this.selectedCategory.set(null);
    this.searchQuery.set(normalizedQuery);
    this.urlState.setSearch(normalizedQuery);
    this.scrollToTop();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.resetArchivePage();
    this.urlState.setSearch(null);
    this.scrollToTop();
  }

  closeArticle(): void {
    this.selectedPostId.set(null);
    this.urlState.closeArticle();
    this.scrollToTop();
  }

  goHome(): void {
    this.shouldScrollToArchive = false;
    this.clearTeamFilter();
    this.scrollToTop();
  }

  changeArchivePage(page: number): void {
    const totalPages = Math.max(this.archiveViewModel().totalPages, 1);
    const nextPage = Math.min(Math.max(Math.trunc(page), 1), totalPages);

    if (nextPage === this.archivePage()) {
      return;
    }

    this.shouldScrollToArchive = true;
    this.archivePage.set(nextPage);
    this.urlState.setPage(nextPage);
  }

  selectNavItem(item: NavItem): void {
    if (item.path) {
      void this.router.navigateByUrl(item.path);
      this.scrollToTop();
      return;
    }

    if (item.taxonomy === 'post_tag') {
      this.selectTag({
        id: item.id,
        name: item.name,
        slug: item.slug,
        taxonomy: 'post_tag',
      });
      return;
    }

    this.selectCategory({
      id: item.id,
      name: item.name,
      slug: item.slug,
      taxonomy: 'category',
    });
  }

  selectTeam(team: TeamFilter): void {
    const nextTeam = this.selectedTeam()?.code === team.code ? null : team;
    this.selectFeed({ team: nextTeam });
  }

  selectTag(tag: ArticleTag): void {
    this.selectFeed({ tag }, true);
  }

  selectTerm(term: ArticleTerm): void {
    if (term.taxonomy === 'category') {
      this.selectCategory(term);
      return;
    }

    this.selectTag({
      id: term.id,
      name: term.name,
      slug: term.slug,
      taxonomy: 'post_tag',
    });
  }

  selectCategory(category: ArticleTerm): void {
    this.selectFeed({ category }, true);
  }

  clearTeamFilter(): void {
    this.selectFeed();
  }

  private syncUrlState(): void {
    const state = this.urlState.readCurrentState(this.teams);
    const path = this.router.url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    this.currentPath.set(path);

    this.aboutPageOpen.set(path === '/o-nas');
    this.authorPageOpen.set(path.startsWith('/autor/'));
    this.supportPageOpen.set(path === '/wspieraj');
    this.matchAlertPageOpen.set(path === '/alert-meczowy');
    this.historyPageOpen.set(path === '/historia-nba');
    this.accountPageOpen.set(
      path === '/moje-konto/login' ||
      path === '/moje-konto/forgot-password' ||
      path === '/moje-konto/reset-password',
    );
    this.accountProfilePageOpen.set(
      path === '/moje-konto' || path.startsWith('/moje-konto/edit-account'),
    );
    this.notFoundPageOpen.set(
      path === '/404' ||
      (![
        '/',
        '/o-nas',
        '/wspieraj',
        '/alert-meczowy',
        '/historia-nba',
        '/moje-konto',
        '/moje-konto/login',
        '/moje-konto/forgot-password',
        '/moje-konto/reset-password',
      ].includes(path) && !path.startsWith('/artykul/') && !path.startsWith('/autor/')),
    );
    this.selectedTeam.set(state.team);
    this.searchQuery.set(state.query);
    this.selectedTag.set(state.tag);
    this.selectedCategory.set(state.category);
    this.selectedPostId.set(state.postId);
    this.archivePage.set(state.archivePage);
  }

  private selectFeed(selection: FeedSelection = {}, scrollToTop = false): void {
    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.searchQuery.set('');
    this.selectedTeam.set(selection.team ?? null);
    this.selectedTag.set(selection.tag ?? null);
    this.selectedCategory.set(selection.category ?? null);
    this.urlState.replaceFeedSelection(selection);

    if (scrollToTop) {
      this.scrollToTop();
    }
  }

  private resetArchivePage(): void {
    this.archivePage.set(1);
  }

  private scrollToArchiveSection(): void {
    const view = this.document.defaultView;

    if (!view) {
      return;
    }

    setTimeout(() => {
      view.requestAnimationFrame(() => {
        const archiveSection = this.document.getElementById('archive-section');

        if (!archiveSection) {
          return;
        }

        const headerHeight =
          this.document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
        const top = archiveSection.getBoundingClientRect().top + view.scrollY - headerHeight - 16;

        view.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      });
    });
  }

  private scrollToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updatePageMetadata(
    leadViewModel: HomeViewModel,
    viewModel: ArticleDetailViewModel,
    aboutPageOpen: boolean,
    authorPageOpen: boolean,
    supportPageOpen: boolean,
    matchAlertPageOpen: boolean,
    historyPageOpen: boolean,
    accountPageOpen: boolean,
    accountProfilePageOpen: boolean,
    notFoundPageOpen: boolean,
  ): void {
    const article = viewModel.article;

    if (notFoundPageOpen) {
      this.seo.setNotFound();
      return;
    }

    if (aboutPageOpen) {
      this.seo.setStaticPage(
        'O nas | Szósty Gracz',
        'Poznaj historię i redakcję Szóstego Gracza oraz nasze teksty, podcasty i materiały o NBA.',
        '/o-nas',
      );
      return;
    }

    if (authorPageOpen) {
      return;
    }

    if (supportPageOpen) {
      this.seo.setStaticPage(
        'Wspieraj 6G | Szósty Gracz',
        'Wspieraj Szóstego Gracza i pomóż nam tworzyć niezależne teksty, podcasty i materiały o NBA.',
        '/wspieraj',
      );
      return;
    }

    if (matchAlertPageOpen) {
      this.seo.setStaticPage(
        'Alert meczowy | Szósty Gracz',
        'Bez spoilerów podpowiadamy, które mecze NBA minionej nocy warto obejrzeć z odtworzenia.',
        '/alert-meczowy',
      );
      return;
    }

    if (historyPageOpen) {
      this.seo.setStaticPage(
        'Historia NBA | Szósty Gracz',
        'Najciekawsze historie NBA: wielkie dynastie, lata 90., Jordan, Kobe, LeBron, Warriors i pełne archiwum tekstów Szóstego Gracza.',
        '/historia-nba',
      );
      return;
    }

    if (accountPageOpen) {
      const accountPath = this.router.url.split(/[?#]/, 1)[0];
      const isForgotPassword = accountPath === '/moje-konto/forgot-password';
      const isResetPassword = accountPath === '/moje-konto/reset-password';
      const title = isResetPassword
        ? 'Ustaw nowe hasło | Szósty Gracz'
        : isForgotPassword
          ? 'Odzyskaj hasło | Szósty Gracz'
          : 'Logowanie | Szósty Gracz';
      const description = isResetPassword
        ? 'Ustaw nowe hasło do swojego konta w serwisie Szósty Gracz.'
        : isForgotPassword
          ? 'Odzyskaj dostęp do swojego konta w serwisie Szósty Gracz.'
          : 'Zaloguj się lub utwórz konto w serwisie Szósty Gracz.';

      this.seo.setStaticPage(
        title,
        description,
        accountPath,
        'noindex, follow',
      );
      return;
    }

    if (accountProfilePageOpen) {
      this.seo.setStaticPage(
        'Dane konta | Szósty Gracz',
        'Sprawdź i zaktualizuj dane swojego konta w Szóstym Graczu.',
        '/moje-konto',
        'noindex, follow',
      );
      return;
    }

    if (!article) {
      this.seo.setHome(leadViewModel.hero?.heroImageUrl || leadViewModel.hero?.imageUrl);
      return;
    }

    this.seo.setArticle(article);
  }
}
