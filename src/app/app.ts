import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { ArticleDetail } from './components/article-detail/article-detail';
import { LatestPanel } from './components/latest-panel/latest-panel';
import { LeadGrid } from './components/lead-grid/lead-grid';
import { NewsTicker } from './components/news-ticker/news-ticker';
import { SiteHeader } from './components/site-header/site-header';
import { LOGO_URL, NAV_ITEMS, TEAMS } from './data/site-data';
import { NavItem, TeamFilter } from './models/ui';
import {
  Article,
  ArticleDetailViewModel,
  ArticleTag,
  ArticleTerm,
  HomeViewModel,
  PaginatedArticles,
} from './models/wordpress';
import { Wordpress } from './services/wordpress';

@Component({
  selector: 'app-root',
  imports: [
    ArticleDetail,
    LatestPanel,
    LeadGrid,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NewsTicker,
    SiteHeader,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class App {
  private readonly wordpress = inject(Wordpress);
  private shouldScrollToArchive = false;
  private readonly loadingViewModel: HomeViewModel = {
    loading: true,
    posts: [],
    sideArticles: [],
    latest: [],
    total: 0,
    totalPages: 0,
    page: 1,
  };

  readonly logoUrl = LOGO_URL;
  readonly navItems = NAV_ITEMS;
  readonly teams = TEAMS;
  readonly selectedTeam = signal<TeamFilter | null>(null);
  readonly selectedTag = signal<ArticleTag | null>(null);
  readonly selectedCategory = signal<ArticleTerm | null>(null);
  readonly selectedPostId = signal<number | null>(null);
  readonly archivePage = signal(1);

  readonly selectedFeed = computed(() => {
    const tag = this.selectedTag();
    const team = this.selectedTeam();

    if (tag) {
      return { type: 'tag' as const, tag };
    }

    const category = this.selectedCategory();

    if (category) {
      return { type: 'category' as const, category };
    }

    if (team) {
      return { type: 'team' as const, team };
    }

    return { type: 'latest' as const };
  });

  readonly selectedArchiveRequest = computed(() => ({
    feed: this.selectedFeed(),
    page: this.archivePage(),
  }));

  readonly leadViewModel = toSignal(
    toObservable(this.selectedFeed).pipe(
      switchMap((feed) =>
        this.getPostsForFeed(feed, 1).pipe(
          map((result) => this.composeViewModel(result)),
          startWith(this.loadingViewModel),
          catchError(() =>
            of<HomeViewModel>({
              loading: false,
              error: 'Nie udaĹ‚o siÄ™ pobraÄ‡ wpisĂłw z WordPress API.',
              posts: [],
              sideArticles: [],
              latest: [],
              total: 0,
              totalPages: 0,
              page: 1,
            }),
          ),
        ),
      ),
    ),
    { initialValue: this.loadingViewModel },
  );

  readonly archiveViewModel = toSignal(
    toObservable(this.selectedArchiveRequest).pipe(
      switchMap(({ feed, page }) =>
        this.getPostsForFeed(feed, page).pipe(
          map((result) => this.composeViewModel(result)),
          startWith({ ...this.loadingViewModel, page }),
          catchError(() =>
            of<HomeViewModel>({
              loading: false,
              error: 'Nie udało się pobrać wpisów z WordPress API.',
              posts: [],
              sideArticles: [],
              latest: [],
              total: 0,
              totalPages: 0,
              page,
            }),
          ),
        ),
      ),
    ),
    { initialValue: this.loadingViewModel },
  );

  readonly visibleLatest = computed(() => {
    return this.archiveViewModel().posts;
  });
  readonly archivePages = computed(() =>
    this.buildArchivePages(this.archiveViewModel().page, this.archiveViewModel().totalPages),
  );

  readonly feedTitle = computed(
    () =>
      this.selectedTag()?.name ??
      this.selectedCategory()?.name ??
      this.selectedTeam()?.name ??
      'Najnowsze',
  );
  readonly activeNavItemKey = computed(() => {
    const tag = this.selectedTag();

    if (tag) {
      return this.termKey(tag);
    }

    const category = this.selectedCategory();

    return category ? this.termKey(category) : null;
  });
  readonly allFeedSelected = computed(
    () => !this.selectedTeam() && !this.selectedTag() && !this.selectedCategory(),
  );
  readonly archiveTitle = computed(() => `Archiwum: ${this.feedTitle()}`);
  readonly tickerLabel = computed(() => {
    const tag = this.selectedTag();
    const category = this.selectedCategory();

    return tag
      ? `#${tag.name}`
      : (category?.name.toUpperCase() ?? this.selectedTeam()?.code ?? 'NAJNOWSZE');
  });

  readonly articleDetailViewModel = toSignal(
    toObservable(this.selectedPostId).pipe(
      switchMap((postId) => {
        if (!postId) {
          return of<ArticleDetailViewModel>({ loading: false, comments: [], commentCount: 0 });
        }

        return forkJoin({
          article: this.wordpress.getPostDetail(postId),
          comments: this.wordpress.getCommentsByPost(postId).pipe(catchError(() => of([]))),
        }).pipe(
          map(({ article, comments }) => ({
            loading: false,
            article,
            comments,
            commentCount: comments.length,
          })),
          startWith({ loading: true, comments: [], commentCount: 0 }),
          catchError(() =>
            of<ArticleDetailViewModel>({
              loading: false,
              error: 'Nie udało się pobrać tego wpisu.',
              comments: [],
              commentCount: 0,
            }),
          ),
        );
      }),
    ),
    { initialValue: { loading: false, comments: [], commentCount: 0 } },
  );

  constructor() {
    const params = new URLSearchParams(window.location.search);
    const teamCode = params.get('team');
    const tagSlug = params.get('tag');
    const categorySlug = params.get('category');
    const postId = Number(params.get('post'));
    const archivePage = Number(params.get('page'));
    const team = this.teams.find((item) => item.code === teamCode);

    if (team) {
      this.selectedTeam.set(team);
    }

    if (tagSlug) {
      this.selectedTeam.set(null);
      this.selectedCategory.set(null);
      this.selectedTag.set({
        id: 0,
        name: this.labelFromSlug(tagSlug),
        slug: tagSlug,
        taxonomy: 'post_tag',
      });
    } else if (categorySlug) {
      this.selectedTeam.set(null);
      this.selectedTag.set(null);
      this.selectedCategory.set({
        id: 0,
        name: this.labelFromSlug(categorySlug),
        slug: categorySlug,
        taxonomy: 'category',
      });
    }

    if (Number.isInteger(postId) && postId > 0) {
      this.selectedPostId.set(postId);
    }

    if (Number.isInteger(archivePage) && archivePage > 1) {
      this.archivePage.set(archivePage);
    }

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
    this.updatePostQueryParam(article.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeArticle(): void {
    this.selectedPostId.set(null);
    this.updatePostQueryParam(null);
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
    this.updatePostQueryParam(null);
    this.updatePageQueryParam(nextPage);
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

    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.selectedTag.set(null);
    this.selectedCategory.set(null);
    this.selectedTeam.set(nextTeam);
    this.updateTeamQueryParam(nextTeam);
    this.updateTagQueryParam(null);
    this.updateCategoryQueryParam(null);
    this.updatePostQueryParam(null);
  }

  selectTag(tag: ArticleTag): void {
    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.selectedTeam.set(null);
    this.selectedCategory.set(null);
    this.selectedTag.set(tag);
    this.updateTeamQueryParam(null);
    this.updateTagQueryParam(tag);
    this.updateCategoryQueryParam(null);
    this.updatePostQueryParam(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.selectedTeam.set(null);
    this.selectedTag.set(null);
    this.selectedCategory.set(category);
    this.updateTeamQueryParam(null);
    this.updateTagQueryParam(null);
    this.updateCategoryQueryParam(category);
    this.updatePostQueryParam(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearTeamFilter(): void {
    this.resetArchivePage();
    this.selectedPostId.set(null);
    this.selectedTeam.set(null);
    this.selectedTag.set(null);
    this.selectedCategory.set(null);
    this.updateTeamQueryParam(null);
    this.updateTagQueryParam(null);
    this.updateCategoryQueryParam(null);
    this.updatePostQueryParam(null);
  }

  private updateTeamQueryParam(team: TeamFilter | null): void {
    const url = new URL(window.location.href);

    if (team) {
      url.searchParams.set('team', team.code);
    } else {
      url.searchParams.delete('team');
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private updatePostQueryParam(postId: number | null): void {
    const url = new URL(window.location.href);

    if (postId) {
      url.searchParams.set('post', postId.toString());
    } else {
      url.searchParams.delete('post');
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private updatePageQueryParam(page: number | null): void {
    const url = new URL(window.location.href);

    if (page && page > 1) {
      url.searchParams.set('page', page.toString());
    } else {
      url.searchParams.delete('page');
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private updateTagQueryParam(tag: ArticleTag | null): void {
    const url = new URL(window.location.href);

    if (tag) {
      url.searchParams.set('tag', tag.slug);
    } else {
      url.searchParams.delete('tag');
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private updateCategoryQueryParam(category: ArticleTerm | null): void {
    const url = new URL(window.location.href);

    if (category) {
      url.searchParams.set('category', category.slug);
    } else {
      url.searchParams.delete('category');
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private getPostsForFeed(feed: ReturnType<App['selectedFeed']>, page: number) {
    if (feed.type === 'tag') {
      return this.wordpress.getPostsByTag(feed.tag, page);
    }

    if (feed.type === 'category') {
      return this.wordpress.getPostsByCategory(feed.category, page);
    }

    if (feed.type === 'team') {
      return this.wordpress.getPostsByTeamTag(feed.team.name, page);
    }

    return this.wordpress.getLatestPosts(page);
  }

  private labelFromSlug(slug: string): string {
    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private termKey(term: Pick<ArticleTerm, 'slug' | 'taxonomy'>): string {
    return `${term.taxonomy}:${term.slug}`;
  }

  private resetArchivePage(): void {
    this.archivePage.set(1);
    this.updatePageQueryParam(null);
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

  private buildArchivePages(currentPage: number, totalPages: number): number[] {
    const safeTotal = Math.max(Math.floor(totalPages), 0);

    if (safeTotal <= 1) {
      return [];
    }

    const safeCurrent = Math.min(Math.max(Math.floor(currentPage), 1), safeTotal);
    const visiblePages = 7;
    const halfWindow = Math.floor(visiblePages / 2);
    let start = Math.max(safeCurrent - halfWindow, 1);
    const end = Math.min(start + visiblePages - 1, safeTotal);
    start = Math.max(end - visiblePages + 1, 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  private composeViewModel(result: PaginatedArticles): HomeViewModel {
    const posts = result.articles;

    return {
      loading: false,
      posts,
      hero: posts[0],
      sideArticles: posts.slice(1, 4),
      latest: posts.slice(0, 8),
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
    };
  }
}
