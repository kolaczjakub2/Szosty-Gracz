import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-account-profile-page',
  imports: [FormsModule, RouterLink, UiIcon],
  templateUrl: './account-profile-page.html',
  styleUrl: './account-profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly avatarBusy = signal(false);
  readonly error = signal('');
  readonly avatarError = signal('');
  readonly success = signal('');
  readonly avatarSuccess = signal('');
  readonly avatarUrl = signal('');
  readonly avatarDragging = signal(false);

  displayName = '';
  email = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor() {
    effect(() => {
      if (this.auth.sessionReady() && !this.auth.authenticated()) {
        void this.router.navigate(['/moje-konto/login'], {
          queryParams: { returnUrl: '/moje-konto' },
          replaceUrl: true,
        });
        return;
      }

      const user = this.auth.user();

      if (!user) {
        return;
      }

      this.displayName = user.name;
      this.email = user.email;
      this.avatarUrl.set(user.avatarUrl || '');
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    });
  }

  submit(): void {
    if (!this.auth.authenticated() || this.busy()) return;

    const displayName = this.displayName.trim();
    const email = this.email.trim();

    if (!displayName || !email) {
      this.error.set('Uzupełnij nazwę wyświetlaną i adres e-mail.');
      return;
    }

    if (this.newPassword || this.confirmPassword || this.currentPassword) {
      if (!this.currentPassword.trim()) {
        this.error.set('Podaj obecne hasło, aby ustawić nowe.');
        return;
      }

      if (this.newPassword !== this.confirmPassword) {
        this.error.set('Nowe hasła muszą być identyczne.');
        return;
      }
    }

    this.busy.set(true);
    this.error.set('');
    this.success.set('');

    this.auth
      .updateAccount({
        displayName,
        email,
        currentPassword: this.currentPassword,
        newPassword: this.newPassword || undefined,
        confirmPassword: this.confirmPassword || undefined,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (user) => {
          this.displayName = user.name;
          this.email = user.email;
          this.avatarUrl.set(user.avatarUrl || this.avatarUrl());
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.success.set('Dane konta zostały zapisane.');
        },
        error: (error: Error) => this.error.set(error.message),
      });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file) {
      return;
    }

    this.uploadAvatar(file);
  }

  onAvatarDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.avatarBusy()) {
      this.avatarDragging.set(true);
    }
  }

  onAvatarDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.avatarDragging.set(false);
  }

  onAvatarDrop(event: DragEvent): void {
    event.preventDefault();
    this.avatarDragging.set(false);

    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    this.uploadAvatar(file);
  }

  private uploadAvatar(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.avatarError.set('Avatar musi być plikiem graficznym.');
      return;
    }

    this.avatarBusy.set(true);
    this.avatarError.set('');
    this.avatarSuccess.set('');

    this.auth
      .uploadAvatar(file)
      .pipe(finalize(() => this.avatarBusy.set(false)))
      .subscribe({
        next: (user) => {
          this.avatarUrl.set(user.avatarUrl || '');
          this.avatarSuccess.set('Avatar został przesłany.');
        },
        error: (error: Error) => this.avatarError.set(error.message),
      });
  }
}
