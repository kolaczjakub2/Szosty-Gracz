import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, startWith } from 'rxjs';

import { Article, ArticleTerm } from '../../models/wordpress';
import { Wordpress } from '../../services/wordpress';
import { HistoryCard } from '../history-card/history-card';
import { UiIcon } from '../ui-icon/ui-icon';

interface HistorySectionDefinition {
  readonly title: string;
  readonly term: ArticleTerm;
  readonly count: number;
}

interface HistorySection extends HistorySectionDefinition {
  readonly articles: readonly Article[];
}

interface HistoryViewModel {
  readonly loading: boolean;
  readonly error?: string;
  readonly random: readonly Article[];
  readonly sections: readonly HistorySection[];
  readonly latest: readonly Article[];
}

const category = (id: number, name: string, slug: string): ArticleTerm => ({
  id,
  name,
  slug,
  taxonomy: 'category',
});

// Kolejność i źródła odpowiadają dokładnie kategoriom redakcyjnym strony Historia NBA.
const HISTORY_SECTIONS: readonly HistorySectionDefinition[] = [
  { title: 'LATA 90-TE', term: category(3505, 'Nineties', 'nineties'), count: 6 },
  { title: 'JORDAN I BULLS', term: category(3501, 'JordanBulls', 'jordanbulls'), count: 6 },
  { title: 'BÓJKI W NBA', term: category(3512, 'Bójki', 'bojki'), count: 3 },
  { title: 'KOBE', term: category(3503, 'Kobe Bryant', 'kobebryant'), count: 4 },
  { title: 'LEBRON', term: category(3504, 'LeBron James', 'lebronjames'), count: 4 },
  { title: 'WARRIORS', term: category(3502, 'Era Warriors', 'erawarriors'), count: 4 },
];

const RANDOM_HISTORY_CATEGORY_ID = 3506; // historianba
const HISTORY_CATEGORY = category(1579, 'Historia', 'historia');

@Component({
  selector: 'app-history-page',
  imports: [HistoryCard, UiIcon],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  private readonly router = inject(Router);
  private readonly wordpress = inject(Wordpress);

  readonly viewModel = toSignal(
    forkJoin({
      random: this.wordpress.getRandomPostsByCategory(RANDOM_HISTORY_CATEGORY_ID, 3).pipe(catchError(() => of([]))),
      sections: forkJoin(
        HISTORY_SECTIONS.map((section) =>
          this.wordpress.getPostsByCategory(section.term, 1, section.count).pipe(
            map((result) => ({ ...section, articles: result.articles })),
            catchError(() => of({ ...section, articles: [] })),
          ),
        ),
      ),
      latest: this.wordpress.getPostsByCategory(HISTORY_CATEGORY, 1, 5).pipe(
        map((result) => result.articles),
        catchError(() => of([])),
      ),
    }).pipe(
      map(({ random, sections, latest }): HistoryViewModel => ({
        loading: false,
        random,
        sections,
        latest,
      })),
      startWith<HistoryViewModel>({ loading: true, random: [], sections: [], latest: [] }),
      catchError(() =>
        of<HistoryViewModel>({
          loading: false,
          error: 'Nie udało się pobrać archiwum historii NBA.',
          random: [],
          sections: [],
          latest: [],
        }),
      ),
    ),
    { initialValue: { loading: true, random: [], sections: [], latest: [] } as HistoryViewModel },
  );

  openArticle(article: Article): void {
    void this.router.navigate(['/artykul', article.id, article.slug]);
  }

  openHistoryArchive(): void {
    void this.router.navigate(['/'], { queryParams: { category: HISTORY_CATEGORY.slug } });
  }

  sectionNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
