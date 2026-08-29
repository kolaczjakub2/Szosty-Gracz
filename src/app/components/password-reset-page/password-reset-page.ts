import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-password-reset-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './password-reset-page.html',
  styleUrl: './password-reset-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loginParam = this.route.snapshot.queryParamMap.get('login')?.trim() ?? '';
  readonly key = this.route.snapshot.queryParamMap.get('key')?.trim() ?? '';
  readonly resetMode = Boolean(this.loginParam && this.key);
  readonly validating = signal(this.resetMode);
  readonly valid = signal(!this.resetMode);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  login = '';
  password = '';
  confirmPassword = '';

  constructor() {
    if (this.resetMode) {
      this.auth.validatePasswordReset(this.loginParam, this.key)
        .pipe(finalize(() => this.validating.set(false)))
        .subscribe({
          next: () => this.valid.set(true),
          error: (error: Error) => this.error.set(error.message),
        });
    }
  }

  requestReset(): void {
    if (!this.login.trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.requestPasswordReset(this.login.trim())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (response) => this.success.set(response.message),
        error: (error: Error) => this.error.set(error.message),
      });
  }

  setPassword(): void {
    if (!this.valid() || this.busy()) return;
    if (this.password.length < 8) {
      this.error.set('Hasło musi mieć co najmniej 8 znaków.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Hasła muszą być identyczne.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.resetPassword(this.loginParam, this.key, this.password, this.confirmPassword)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (response) => { this.success.set(response.message); this.valid.set(false); },
        error: (error: Error) => this.error.set(error.message),
      });
  }
}
