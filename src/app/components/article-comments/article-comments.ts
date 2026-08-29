import { DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ArticleComment } from '../../models/wordpress';
import { AuthService } from '../../services/auth';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-article-comments',
  imports: [DatePipe, FormsModule, RouterLink, UiIcon],
  templateUrl: './article-comments.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComments {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  readonly postId = input.required<number>();
  readonly comments = input.required<readonly ArticleComment[]>();
  readonly commentCount = input.required<number>();
  readonly visibleComments = signal<readonly ArticleComment[]>([]);
  readonly replyTo = signal<ArticleComment | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly likeBusy = signal<number | null>(null);
  readonly likeError = signal('');

  content = '';

  constructor() {
    afterNextRender(() => {
      if (this.document.defaultView?.location.hash !== '#comments') return;

      this.document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    effect((onCleanup) => {
      const comments = this.comments();
      this.visibleComments.set(comments);

      if (!this.auth.authenticated() || !comments.length) return;

      const subscription = this.auth.getCommentLikes(comments.map((comment) => comment.id)).subscribe({
        next: ({ likes }) => {
          const byId = new Map(likes.map((like) => [like.id, like]));
          this.visibleComments.update((current) => current.map((comment) => {
            const like = byId.get(comment.id);
            return like ? { ...comment, likeCount: like.count, liked: like.liked } : comment;
          }));
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  loginReturnUrl(): string {
    return `${this.router.url.split('#', 1)[0]}#comments`;
  }

  startReply(comment: ArticleComment): void {
    this.replyTo.set(comment);
    this.content = '';
    this.error.set('');
    this.success.set('');
  }

  cancelReply(): void {
    this.replyTo.set(null);
    this.content = '';
    this.error.set('');
  }

  submit(): void {
    const content = this.content.trim();
    if (!content || this.busy() || !this.auth.authenticated()) return;

    const parent = this.replyTo();
    this.busy.set(true);
    this.error.set('');
    this.success.set('');

    this.auth
      .createComment(this.postId(), content, parent?.id ?? 0)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (response) => {
          if (response.status === 'approved') {
            const newComment: ArticleComment = {
              id: response.id,
              authorName: response.authorName,
              avatarUrl: response.avatarUrl,
              date: new Date(response.date),
              contentHtml: this.toCommentHtml(content),
              parentId: response.parentId,
              depth: parent ? Math.min(parent.depth + 1, 5) : 0,
              likeCount: 0,
              liked: false,
            };
            this.visibleComments.update((comments) => this.insertReply(comments, newComment));
          }

          this.content = '';
          this.replyTo.set(null);
          this.success.set(response.message);
        },
        error: (error: Error) => this.error.set(error.message),
      });
  }

  toggleLike(comment: ArticleComment): void {
    if (!this.auth.authenticated() || this.likeBusy() !== null) return;

    this.likeBusy.set(comment.id);
    this.likeError.set('');
    this.auth.toggleCommentLike(comment.id).pipe(finalize(() => this.likeBusy.set(null))).subscribe({
      next: (like) => this.visibleComments.update((comments) => comments.map((item) =>
        item.id === like.id ? { ...item, likeCount: like.count, liked: like.liked } : item,
      )),
      error: (error: Error) => this.likeError.set(error.message),
    });
  }

  private insertReply(comments: readonly ArticleComment[], comment: ArticleComment): ArticleComment[] {
    if (!comment.parentId) return [...comments, comment];

    const parentIndex = comments.findIndex((item) => item.id === comment.parentId);
    if (parentIndex < 0) return [...comments, comment];

    let insertAt = parentIndex + 1;
    while (insertAt < comments.length && comments[insertAt].depth > comments[parentIndex].depth) {
      insertAt += 1;
    }

    return [...comments.slice(0, insertAt), comment, ...comments.slice(insertAt)];
  }

  private toCommentHtml(content: string): string {
    const container = this.document.createElement('div');
    container.textContent = content;

    return `<p>${container.innerHTML.replace(/\r?\n/g, '<br>')}</p>`;
  }
}
