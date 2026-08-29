import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';

import { Wordpress } from '../../services/wordpress';

interface MatchAlertViewModel {
  readonly loading: boolean;
  readonly error: boolean;
  readonly contentHtml: string;
  readonly modified: Date | null;
}

@Component({
  selector: 'app-match-alert-page',
  imports: [RouterLink],
  templateUrl: './match-alert-page.html',
  styleUrl: './match-alert-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchAlertPage {
  private readonly document = inject(DOCUMENT);
  private readonly wordpress = inject(Wordpress);

  readonly viewModel = toSignal(
    this.wordpress.getPostDetail(268259).pipe(
      map((article): MatchAlertViewModel => ({
        loading: false,
        error: false,
        contentHtml: this.prepareRanking(article.contentHtml),
        modified: article.date,
      })),
      startWith({ loading: true, error: false, contentHtml: '', modified: null }),
      catchError(() =>
        of({ loading: false, error: true, contentHtml: '', modified: null }),
      ),
    ),
    { initialValue: { loading: true, error: false, contentHtml: '', modified: null } },
  );

  private prepareRanking(html: string): string {
    const root = this.document.createElement('div');
    root.innerHTML = html;

    Array.from(root.children)
      .slice(0, 7)
      .forEach((element) => element.remove());

    root.querySelectorAll('script, style, iframe').forEach((element) => element.remove());
    root.querySelectorAll('img').forEach((image) => {
      image.setAttribute('loading', 'lazy');
      image.setAttribute('alt', image.getAttribute('alt') || 'Oznaczenie meczu');
    });

    const roundLabels = new Set([
      'PLAYOFFY',
      'FINAŁY',
      'FINAŁY KONFERENCJI',
      'DRUGA RUNDA',
      'PIERWSZA RUNDA',
      'PLAY-IN',
    ]);

    Array.from(root.children).forEach((element) => {
      if (element.tagName === 'P' && roundLabels.has(element.textContent?.trim().toUpperCase() ?? '')) {
        element.classList.add('match-round');
      }
    });

    Array.from(root.children).forEach((element) => {
      if (element.tagName !== 'OL' && element.tagName !== 'UL') {
        return;
      }

      const heading = element.previousElementSibling;

      if (!heading || heading.tagName !== 'P' || heading.classList.contains('match-round')) {
        return;
      }

      const series = this.document.createElement('section');
      series.className = 'match-series';
      heading.before(series);
      series.append(heading, element);
    });

    Array.from(root.children).forEach((element) => {
      if (element.tagName !== 'P' || element.querySelectorAll('br').length < 2) {
        return;
      }

      const fragments = element.innerHTML
        .split(/<br\s*\/?>/i)
        .map((fragment) => fragment.trim())
        .filter(Boolean);

      if (fragments.length < 2) {
        return;
      }

      const precedingSeries = element.previousElementSibling;

      if (precedingSeries?.classList.contains('match-series')) {
        const table = Array.from(precedingSeries.children).find(
          (child) => child.tagName === 'OL' || child.tagName === 'UL',
        );

        fragments.forEach((fragment) => {
          const game = this.document.createElement('li');
          game.className = 'match-unrated';
          game.innerHTML = fragment;
          table?.append(game);
        });

        element.remove();
      } else {
        const table = this.document.createElement('ul');
        table.className = 'match-unrated-list';

        fragments.forEach((fragment) => {
          const game = this.document.createElement('li');
          game.className = 'match-unrated';
          game.innerHTML = fragment;
          table.append(game);
        });

        element.replaceWith(table);
      }
    });

    const result = root.innerHTML;
    root.remove();
    return result;
  }
}
