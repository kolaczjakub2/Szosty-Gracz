import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-account-page',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly returnUrl = this.getReturnUrl();
  readonly loginBusy = signal(false);
  readonly registerBusy = signal(false);
  readonly loginError = signal('');
  readonly registerError = signal('');
  readonly registerSuccess = signal('');

  login = '';
  password = '';
  remember = false;
  email = '';

  submitLogin(): void {
    if (!this.login.trim() || !this.password || this.loginBusy()) return;
    this.loginBusy.set(true);
    this.loginError.set('');
    this.auth
      .login(this.login.trim(), this.password, this.remember)
      .pipe(finalize(() => this.loginBusy.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl),
        error: (error: Error) => this.loginError.set(error.message),
      });
  }

  submitRegistration(): void {
    if (!this.email.trim() || this.registerBusy()) return;
    this.registerBusy.set(true);
    this.registerError.set('');
    this.registerSuccess.set('');
    this.auth
      .register(this.email.trim())
      .pipe(finalize(() => this.registerBusy.set(false)))
      .subscribe({
        next: (response) => this.registerSuccess.set(response.message),
        error: (error: Error) => this.registerError.set(error.message),
      });
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')?.trim() ?? '';

    if (
      !returnUrl.startsWith('/') ||
      returnUrl.startsWith('//') ||
      returnUrl.startsWith('/moje-konto/login')
    ) {
      return '/moje-konto';
    }

    return returnUrl;
  }
}
