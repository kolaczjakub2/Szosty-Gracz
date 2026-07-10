import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { ArticleTag } from '../../models/wordpress';

@Component({
  selector: 'app-article-tags',
  imports: [MatButtonModule],
  templateUrl: './article-tags.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleTags {
  readonly tags = input.required<readonly ArticleTag[]>();
  readonly tagSelected = output<ArticleTag>();
}
