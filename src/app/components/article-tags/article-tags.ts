import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ArticleTag } from '../../models/wordpress';

@Component({
  selector: 'app-article-tags',
  templateUrl: './article-tags.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleTags {
  readonly tags = input.required<readonly ArticleTag[]>();
  readonly tagSelected = output<ArticleTag>();
}
