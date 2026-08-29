import { Article } from '../models/wordpress';

export function uniqueArticles(articles: readonly Article[]): Article[] {
  const seenIds = new Set<number>();

  return articles.filter((article) => {
    if (seenIds.has(article.id)) {
      return false;
    }

    seenIds.add(article.id);
    return true;
  });
}

export function excludeArticles(
  articles: readonly Article[],
  excludedArticles: readonly Article[],
): Article[] {
  const excludedIds = new Set(excludedArticles.map((article) => article.id));

  return uniqueArticles(articles).filter((article) => !excludedIds.has(article.id));
}
