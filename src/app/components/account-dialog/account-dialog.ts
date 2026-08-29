import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-account-dialog',
  imports: [FormsModule, RouterLink, UiIcon],
  templateUrl: './account-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDialog {
  readonly auth = inject(AuthService);
  readonly closed = output<void>();
  readonly mode = signal<'login' | 'register'>('login');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  login = '';
  password = '';
  email = '';

  submitLogin(): void {
    if (!this.login.trim() || !this.password) return;
    this.startRequest();
    this.auth
      .login(this.login.trim(), this.password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: () => this.closed.emit(), error: (error: Error) => this.error.set(error.message) });
  }

  submitRegistration(): void {
    if (!this.email.trim()) return;
    this.startRequest();
    this.auth
      .register(this.email.trim())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (response) => this.success.set(response.message),
        error: (error: Error) => this.error.set(error.message),
      });
  }

  switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set('');
    this.success.set('');
  }

  private startRequest(): void {
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
  }
}
