import { Article } from '../models/wordpress';

export function articlePath(article: Pick<Article, 'id' | 'slug'>): string {
  return `/artykul/${article.id}/${encodeURIComponent(article.slug)}`;
}
