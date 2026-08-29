import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';

import { AuthAccountUpdate, AuthCommentLike, AuthCommentLikesResponse, AuthCommentResponse, AuthMessage, AuthResetValidation, AuthResponse, AuthUser } from '../models/auth';

const API_BASE = 'https://szostygracz.pl/wp-json/szostygracz/v1';
const TOKEN_KEY = 'szostygracz_auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly token = signal(this.readToken());
  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly sessionResolved = signal(!this.token());

  readonly user = this.currentUser.asReadonly();
  readonly sessionReady = this.sessionResolved.asReadonly();
  readonly authenticated = computed(() => Boolean(this.token() && this.currentUser()));

  constructor() {
    if (this.token()) {
      this.loadSession()
        .pipe(finalize(() => this.sessionResolved.set(true)))
        .subscribe({ error: () => this.clearSession() });
    }
  }

  login(login: string, password: string, remember = false): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE}/login`, { login, password }).pipe(
      tap((response) => this.saveSession(response, remember)),
      catchError((error) => this.handleError(error)),
    );
  }

  register(email: string): Observable<AuthMessage> {
    return this.http.post<AuthMessage>(`${API_BASE}/register`, { email }).pipe(
      catchError((error) => this.handleError(error)),
    );
  }

  requestPasswordReset(login: string): Observable<AuthMessage> {
    return this.http.post<AuthMessage>(`${API_BASE}/password/forgot`, { login }).pipe(
      catchError((error) => this.handleError(error)),
    );
  }

  validatePasswordReset(login: string, key: string): Observable<AuthResetValidation> {
    return this.http.post<AuthResetValidation>(`${API_BASE}/password/validate`, { login, key }).pipe(
      catchError((error) => this.handleError(error)),
    );
  }

  resetPassword(login: string, key: string, password: string, confirmPassword: string): Observable<AuthMessage> {
    return this.http.post<AuthMessage>(`${API_BASE}/password/reset`, { login, key, password, confirmPassword }).pipe(
      catchError((error) => this.handleError(error)),
    );
  }

  updateAccount(payload: AuthAccountUpdate): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${API_BASE}/me`, payload, { headers: this.headers() }).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError((error) => this.handleError(error)),
    );
  }

  uploadAvatar(file: File): Observable<AuthUser> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<AuthUser>(`${API_BASE}/me/avatar`, formData, { headers: this.headers() }).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError((error) => this.handleError(error)),
    );
  }

  createComment(postId: number, content: string, parentId = 0): Observable<AuthCommentResponse> {
    return this.http
      .post<AuthCommentResponse>(
        `${API_BASE}/comments`,
        { postId, parentId, content },
        { headers: this.headers() },
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  getCommentLikes(commentIds: readonly number[]): Observable<AuthCommentLikesResponse> {
    return this.http.get<AuthCommentLikesResponse>(`${API_BASE}/comments/likes`, {
      headers: this.headers(),
      params: { ids: commentIds.join(',') },
    }).pipe(catchError((error) => this.handleError(error)));
  }

  toggleCommentLike(commentId: number): Observable<AuthCommentLike> {
    return this.http
      .post<AuthCommentLike>(`${API_BASE}/comments/${commentId}/like`, {}, { headers: this.headers() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  logout(): void {
    const token = this.token();
    this.clearSession();

    if (token) {
      this.http.post(`${API_BASE}/logout`, {}, { headers: this.headers(token) }).subscribe();
    }
  }

  private loadSession(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${API_BASE}/me`, { headers: this.headers() }).pipe(
      tap((user) => this.currentUser.set(user)),
    );
  }

  private saveSession(response: AuthResponse, remember: boolean): void {
    const localStorage = this.getLocalStorage();
    const sessionStorage = this.getSessionStorage();
    const storage = remember ? localStorage : sessionStorage;

    localStorage?.removeItem(TOKEN_KEY);
    sessionStorage?.removeItem(TOKEN_KEY);
    storage?.setItem(TOKEN_KEY, response.token);
    this.token.set(response.token);
    this.currentUser.set(response.user);
  }

  private clearSession(): void {
    this.getLocalStorage()?.removeItem(TOKEN_KEY);
    this.getSessionStorage()?.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private readToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return (
      this.getSessionStorage()?.getItem(TOKEN_KEY) ??
      this.getLocalStorage()?.getItem(TOKEN_KEY) ??
      null
    );
  }

  private getSessionStorage(): Storage | null {
    return this.document.defaultView?.sessionStorage ?? null;
  }

  private getLocalStorage(): Storage | null {
    return this.document.defaultView?.localStorage ?? null;
  }

  private headers(token = this.token()): HttpHeaders {
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private handleError(error: unknown): Observable<never> {
    let message = 'Nie udało się połączyć z WordPressem. Spróbuj ponownie.';

    if (error instanceof HttpErrorResponse) {
      if (error.status === 404 && error.error?.code === 'rest_no_route') {
        message =
          'Moduł kont nie jest jeszcze aktywny na WordPressie. Skontaktuj się z administratorem strony.';
      } else if (typeof error.error?.message === 'string') {
        message = error.error.message;
      }
    }

    return throwError(() => new Error(message));
  }
}
