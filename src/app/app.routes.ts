import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Router, Routes } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { RouteMarker } from './components/route-marker/route-marker';
import { findArchiveAuthor } from './data/archive-authors';
import { AuthService } from './services/auth';

const validArticleRoute: CanMatchFn = (_route, segments) => {
  const articleId = segments[1]?.path ?? '';

  return /^[1-9]\d*$/.test(articleId) ? true : inject(Router).createUrlTree(['/404']);
};

const validAuthorRoute: CanMatchFn = (_route, segments) =>
  findArchiveAuthor(segments[1]?.path ?? '')
    ? true
    : inject(Router).createUrlTree(['/404']);

const authenticatedAccountRoute: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const resolveAccess = () =>
    auth.authenticated()
      ? true
      : router.createUrlTree(['/moje-konto/login'], {
          queryParams: { returnUrl: '/moje-konto' },
        });

  if (auth.sessionReady()) return resolveAccess();

  return toObservable(auth.sessionReady).pipe(
    filter(Boolean),
    take(1),
    map(resolveAccess),
  );
};

export const routes: Routes = [
  {
    path: '',
    component: RouteMarker,
    pathMatch: 'full',
  },
  {
    path: 'artykul/:id/:slug',
    component: RouteMarker,
    canMatch: [validArticleRoute],
  },
  {
    path: 'o-nas',
    loadComponent: () =>
      import('./components/about-page/about-page').then((component) => component.AboutPage),
  },
  {
    path: 'wspieraj',
    loadComponent: () =>
      import('./components/support-page/support-page').then((component) => component.SupportPage),
  },
  {
    path: 'alert-meczowy',
    loadComponent: () =>
      import('./components/match-alert-page/match-alert-page').then(
        (component) => component.MatchAlertPage,
      ),
  },
  {
    path: 'historia-nba',
    loadComponent: () =>
      import('./components/history-page/history-page').then(
        (component) => component.HistoryPage,
      ),
  },
  {
    path: 'moje-konto',
    pathMatch: 'full',
    canMatch: [authenticatedAccountRoute],
    loadComponent: () =>
      import('./components/account-profile-page/account-profile-page').then(
        (component) => component.AccountProfilePage,
      ),
  },
  {
    path: 'moje-konto/login',
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/account-page/account-page').then((component) => component.AccountPage),
  },
  {
    path: 'moje-konto/forgot-password',
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/password-reset-page/password-reset-page').then(
        (component) => component.PasswordResetPage,
      ),
  },
  {
    path: 'moje-konto/reset-password',
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/password-reset-page/password-reset-page').then(
        (component) => component.PasswordResetPage,
      ),
  },
  {
    path: 'moje-konto/edit-account',
    pathMatch: 'full',
    redirectTo: '/moje-konto',
  },
  {
    path: 'moje-konto/my-subscription',
    redirectTo: '/moje-konto',
    pathMatch: 'full',
  },
  {
    path: '2025/10/22/alert-meczowy',
    redirectTo: 'alert-meczowy',
    pathMatch: 'full',
  },
  {
    path: 'autor/:slug',
    canMatch: [validAuthorRoute],
    loadComponent: () =>
      import('./components/author-page/author-page').then((component) => component.AuthorPage),
  },
  {
    path: 'o-nas-2012',
    redirectTo: 'o-nas',
    pathMatch: 'full',
  },
  {
    path: '404',
    loadComponent: () =>
      import('./components/not-found-page/not-found-page').then(
        (component) => component.NotFoundPage,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/not-found-page/not-found-page').then(
        (component) => component.NotFoundPage,
      ),
    pathMatch: 'full',
  },
];
