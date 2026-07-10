import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { ArticleDetail } from './components/article-detail/article-detail';
import { HomeFeed } from './components/home-feed/home-feed';
import { SiteHeader } from './components/site-header/site-header';
import { LOGO_URL, NAV_ITEMS, TEAMS } from './data/site-data';
import { NavItem, TeamFilter } from './models/ui';
import { Article, ArticleTag, ArticleTerm } from './models/wordpress';
import { ArticleFeed } from './services/article-feed';
import { FeedUrlState } from './services/feed-url-state';
import {
  ArchiveRequest,
  SelectedFeed,
  buildArchivePages,
  createEmptyArticleDetailViewModel,
  createLoadingHomeViewModel,
  getActiveNavItemKey,
  getFeedTitle,
  getTickerLabel,
  isAllFeedSelected,
} from './utils/feed-view-model';

interface FeedSelection {
  team?: TeamFilter | null;
  tag?: ArticleTag | null;
  category?: ArticleTerm | null;
}

@Component({
  selector: 'app-root',
  imports: [ArticleDetail, HomeFeed, SiteHeader],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly articleFeed = inject(ArticleFeed);
  private readonly urlState = inject(FeedUrlState);
  private shouldScrollToArchive = false;

  readonly logoUrl = LOGO_URL;
  readonly navItems = NAV_ITEMS;
  readonly teams = TEAMS;
  readonly selectedTeam = signal<TeamFilter | null>(null);
  readonly selectedTag = signal<ArticleTag | null>(null);
  readonly selectedCategory = signal<ArticleTerm | null>(null);
  readonly selectedPostId = signal<number | null>(null);
  readonly archivePage = signal(1);

  readonly selectedFeed = computed<SelectedFeed>(() => {
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

  readonly leadViewModel = toSignal(
    toObservable(this.selectedFeed).pipe(
      switchMap((feed) => this.articleFeed.getHomeViewModel(feed, 1)),
    ),
    { initialValue: createLoadingHomeViewModel() },
  );

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
    getActiveNavItemKey(this.selectedTag(), this.selectedCategory()),
  );

  readonly allFeedSelected = computed(() =>
    isAllFeedSelected(this.selectedTeam(), this.selectedTag(), this.selectedCategory()),
  );

  readonly archiveTitle = computed(() => `Archiwum: ${this.feedTitle()}`);

  readonly tickerLabel = computed(() =>
    getTickerLabel(this.selectedTag(), this.selectedCategory(), this.selectedTeam()),
  );

  readonly articleDetailViewModel = toSignal(
    toObservable(this.selectedPostId).pipe(
      switchMap((postId) => this.articleFeed.getArticleDetailViewModel(postId)),
    ),
    { initialValue: createEmptyArticleDetailViewModel() },
  );

  constructor() {
    this.applyInitialUrlState();

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
  }

  openArticle(article: Article): void {
    this.selectedPostId.set(article.id);
    this.urlState.setPost(article.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeArticle(): void {
    this.selectedPostId.set(null);
    this.urlState.setPost(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goHome(): void {
    this.shouldScrollToArchive = false;
    this.clearTeamFilter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  changeArchivePage(page: number): void {
    const totalPages = Math.max(this.archiveViewModel().totalPages, 1);
    const nextPage = Math.min(Math.max(Math.trunc(page), 1), totalPages);

    if (nextPage === this.archivePage()) {
      return;
    }

    this.selectedPostId.set(null);
    this.shouldScrollToArchive = true;
    this.archivePage.set(nextPage);
    this.urlState.setPost(null);
    this.urlState.setPage(nextPage);
  }

  selectNavItem(item: NavItem): void {
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

  private applyInitialUrlState(): void {
    const initialState = this.urlState.readInitialState(this.teams);

    if (initialState.team) {
      this.selectedTeam.set(initialState.team);
    }

    if (initialState.tag) {
      this.selectedTeam.set(null);
      this.selectedCategory.set(null);
      this.selectedTag.set(initialState.tag);
    } else if (initialState.category) {
      this.selectedTeam.set(null);
      this.selectedTag.set(null);
      this.selectedCategory.set(initialState.category);
    }

    if (initialState.postId) {
      this.selectedPostId.set(initialState.postId);
    }

    this.archivePage.set(initialState.archivePage);
  }

  private selectFeed(selection: FeedSelection = {}, scrollToTop = false): void {
    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.selectedTeam.set(selection.team ?? null);
    this.selectedTag.set(selection.tag ?? null);
    this.selectedCategory.set(selection.category ?? null);
    this.urlState.replaceFeedSelection(selection);

    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private resetArchivePage(): void {
    this.archivePage.set(1);
  }

  private scrollToArchiveSection(): void {
    setTimeout(() => {
      requestAnimationFrame(() => {
        const archiveSection = document.getElementById('archive-section');

        if (!archiveSection) {
          return;
        }

        const headerHeight = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
        const top = archiveSection.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

        window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      });
    });
  }
}
