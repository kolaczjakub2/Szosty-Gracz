import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { findArchiveAuthor } from '../../data/archive-authors';
import { Article } from '../../models/wordpress';
import { SeoService } from '../../services/seo';
import { Wordpress } from '../../services/wordpress';
import {
  buildArchivePages,
  composeHomeViewModel,
  createErrorHomeViewModel,
  createLoadingHomeViewModel,
} from '../../utils/feed-view-model';
import { LatestPanel } from '../latest-panel/latest-panel';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-author-page',
  imports: [LatestPanel, RouterLink, UiIcon],
  templateUrl: './author-page.html',
  styleUrl: './author-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorPage {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly wordpress = inject(Wordpress);

  private readonly author$ = this.route.paramMap.pipe(
    map((params) => findArchiveAuthor(params.get('slug'))),
  );
  private readonly page$ = this.route.queryParamMap.pipe(
    map((params) => {
      const page = Number(params.get('page'));

      return Number.isInteger(page) && page > 1 ? page : 1;
    }),
  );

  readonly author = toSignal(this.author$, { initialValue: null });
  readonly viewModel = toSignal(
    combineLatest([this.author$, this.page$]).pipe(
      switchMap(([author, page]) =>
        author
          ? this.wordpress.getPostsByArchiveAuthor(author.wordpressSlug, page).pipe(
              map((result) => composeHomeViewModel(result)),
              startWith(createLoadingHomeViewModel(page)),
              catchError(() => of(createErrorHomeViewModel(page))),
            )
          : of(createErrorHomeViewModel(page)),
      ),
    ),
    { initialValue: createLoadingHomeViewModel() },
  );
  readonly pages = computed(() =>
    buildArchivePages(this.viewModel().page, this.viewModel().totalPages),
  );

  constructor() {
    effect(() => {
      const author = this.author();

      if (!author) {
        return;
      }

      const page = this.viewModel().page;
      const pageSuffix = page > 1 ? ` — strona ${page}` : '';
      const description = `Teksty autora ${author.name} w archiwum Szóstego Gracza.`;
      const canonicalPath = `/autor/${author.slug}${page > 1 ? `?page=${page}` : ''}`;

      this.seo.setAuthor(`${author.name}${pageSuffix}`, description, canonicalPath);
    });
  }

  openArticle(article: Article): void {
    void this.router.navigate(['/artykul', article.id, article.slug]);
    this.scrollToTop();
  }

  changePage(page: number): void {
    const totalPages = Math.max(this.viewModel().totalPages, 1);
    const nextPage = Math.min(Math.max(Math.trunc(page), 1), totalPages);

    if (nextPage === this.viewModel().page) {
      return;
    }

    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { page: nextPage > 1 ? nextPage : null },
        queryParamsHandling: 'merge',
      })
      .then(() => this.scrollToTop());
  }

  private scrollToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
