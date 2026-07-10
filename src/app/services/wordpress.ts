import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, of, switchMap, type Observable } from 'rxjs';

import {
  Article,
  ArticleComment,
  ArticleDetail,
  ArticleTag,
  ArticleTerm,
  PaginatedArticles,
  WpComment,
  WpPost,
  WpTerm,
} from '../models/wordpress';

interface CommentNode {
  comment: ArticleComment;
  children: CommentNode[];
}

@Injectable({
  providedIn: 'root',
})
export class Wordpress {
  private readonly apiBase = 'https://szostygracz.pl/wp-json/wp/v2';
  private readonly authorNamesById = new Map<number, string>([
    [1, 'Adam Szczepański'],
    [2, 'Maciej Kwiatkowski'],
    [1020, 'Sebastian Bielas'],
    [1980, 'Kwiatkowski & Szczepański'],
  ]);
  private readonly fallbackImage =
    'https://szostygracz.pl/wp-content/uploads/2024/09/6g_2012-1.png';

  constructor(private readonly http: HttpClient) {}

  getLatestPosts(page = 1, perPage = 16): Observable<PaginatedArticles> {
    const params = this.postsParams(page, perPage);

    return this.getPaginatedPosts(params, page);
  }

  getPostsByTeamTag(teamName: string, page = 1, perPage = 16): Observable<PaginatedArticles> {
    const tagParams = new HttpParams().set('search', teamName).set('per_page', 20);

    return this.http.get<WpTerm[]>(`${this.apiBase}/tags`, { params: tagParams }).pipe(
      switchMap((tags) => {
        const matchingTags = this.pickTagsContainingTeamName(tags, teamName);

        if (!matchingTags.length) {
          return of(this.emptyPaginatedPosts(page));
        }

        const postParams = this.postsParams(page, perPage)
          .set('tags', matchingTags.map((tag) => tag.id).join(','));

        return this.getPaginatedPosts(postParams, page);
      }),
    );
  }

  getPostsByTag(tag: ArticleTag, page = 1, perPage = 16): Observable<PaginatedArticles> {
    const tagId$ = tag.id
      ? of(tag.id)
      : this.http
          .get<WpTerm[]>(`${this.apiBase}/tags`, {
            params: new HttpParams().set('slug', tag.slug).set('per_page', 1),
          })
          .pipe(map((tags) => tags[0]?.id ?? 0));

    return tagId$.pipe(
      switchMap((tagId) => {
        if (!tagId) {
          return of(this.emptyPaginatedPosts(page));
        }

        let params = this.postsParams(page, perPage).set('tags', tagId);

        if (tag.slug === 'wake-up') {
          params = params.set('search', 'Wake-Up');
        }

        return this.getPaginatedPosts(params, page);
      }),
    );
  }

  getPostsByCategory(
    category: ArticleTerm,
    page = 1,
    perPage = 16,
  ): Observable<PaginatedArticles> {
    const categoryId$ = category.id
      ? of(category.id)
      : this.http
          .get<WpTerm[]>(`${this.apiBase}/categories`, {
            params: new HttpParams().set('slug', category.slug).set('per_page', 1),
          })
          .pipe(map((categories) => categories[0]?.id ?? 0));

    return categoryId$.pipe(
      switchMap((categoryId) => {
        if (!categoryId) {
          return of(this.emptyPaginatedPosts(page));
        }

        const params = this.postsParams(page, perPage).set('categories', categoryId);

        return this.getPaginatedPosts(params, page);
      }),
    );
  }

  getPostDetail(postId: number): Observable<ArticleDetail> {
    const params = new HttpParams().set('_embed', '1');

    return this.http
      .get<WpPost>(`${this.apiBase}/posts/${postId}`, { params })
      .pipe(map((post) => this.toArticleDetail(post)));
  }

  getCommentsByPost(postId: number): Observable<ArticleComment[]> {
    const params = new HttpParams()
      .set('post', postId)
      .set('per_page', 50)
      .set('orderby', 'date')
      .set('order', 'asc');

    return this.http
      .get<WpComment[]>(`${this.apiBase}/comments`, { params })
      .pipe(map((comments) => this.toCommentThread(comments)));
  }

  private postsParams(page: number, perPage: number): HttpParams {
    return new HttpParams().set('page', page).set('per_page', perPage).set('_embed', '1');
  }

  private getPaginatedPosts(params: HttpParams, page: number): Observable<PaginatedArticles> {
    return this.http
      .get<WpPost[]>(`${this.apiBase}/posts`, { params, observe: 'response' })
      .pipe(
        map((response) => ({
          articles: (response.body ?? []).map((post) => this.toArticle(post)),
          total: Number(response.headers.get('X-WP-Total') ?? 0),
          totalPages: Number(response.headers.get('X-WP-TotalPages') ?? 0),
          page,
        })),
      );
  }

  private emptyPaginatedPosts(page: number): PaginatedArticles {
    return {
      articles: [],
      total: 0,
      totalPages: 0,
      page,
    };
  }

  private toArticle(post: WpPost): Article {
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    const terms = (post._embedded?.['wp:term'] ?? []).flat();
    const category = this.pickPrimaryCategory(terms);
    const title = this.cleanText(post.title.rendered);
    const titleCategory = this.categoryFromTitle(title);
    const categoryName = titleCategory ?? category?.name ?? 'Aktualności';
    const primaryTerm = this.pickPrimaryTerm(terms, categoryName, category);

    return {
      id: post.id,
      title,
      excerpt: this.cleanText(post.excerpt.rendered),
      link: post.link,
      date: new Date(post.date),
      imageUrl:
        media?.media_details?.sizes?.large?.source_url ??
        media?.media_details?.sizes?.td_696x0?.source_url ??
        media?.media_details?.sizes?.medium_large?.source_url ??
        media?.source_url ??
        this.fallbackImage,
      imageAlt: media?.alt_text || title,
      category: categoryName,
      primaryTerm: primaryTerm ? this.toArticleTerm(primaryTerm) : undefined,
    };
  }

  private toArticleDetail(post: WpPost): ArticleDetail {
    const article = this.toArticle(post);
    const terms = (post._embedded?.['wp:term'] ?? []).flat();

    return {
      ...article,
      authorName: this.pickAuthorName(post),
      contentHtml: post.content?.rendered ?? '',
      tags: terms
        .filter((term) => term.taxonomy === 'post_tag')
        .map((term) => this.toArticleTag(term)),
    };
  }

  private toArticleTag(term: WpTerm): ArticleTag {
    return {
      id: term.id,
      name: this.cleanText(term.name),
      slug: term.slug,
      taxonomy: 'post_tag',
    };
  }

  private toArticleTerm(term: WpTerm): ArticleTerm {
    return {
      id: term.id,
      name: this.cleanText(term.name),
      slug: term.slug,
      taxonomy: term.taxonomy,
    };
  }

  private toArticleComment(comment: WpComment): ArticleComment {
    return {
      id: comment.id,
      authorName: this.cleanText(comment.author_name),
      date: new Date(comment.date),
      contentHtml: this.cleanCommentHtml(comment.content.rendered),
      parentId: comment.parent,
      depth: 0,
    };
  }

  private toCommentThread(comments: WpComment[]): ArticleComment[] {
    const nodes: CommentNode[] = comments.map((comment) => ({
      comment: this.toArticleComment(comment),
      children: [],
    }));
    const byId = new Map(nodes.map((node) => [node.comment.id, node]));
    const roots: CommentNode[] = [];

    for (const node of nodes) {
      const parent = byId.get(node.comment.parentId);

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots.flatMap((node) => this.flattenCommentNode(node));
  }

  private flattenCommentNode(node: CommentNode, depth = 0): ArticleComment[] {
    return [
      {
        ...node.comment,
        depth,
      },
      ...node.children.flatMap((child) => this.flattenCommentNode(child, depth + 1)),
    ];
  }

  private pickAuthorName(post: WpPost): string {
    const embeddedAuthorName = Array.isArray(post._embedded?.author)
      ? post._embedded.author.find((author) => author.name)?.name
      : undefined;

    return (
      embeddedAuthorName ?? this.authorNamesById.get(post.author) ?? 'Redakcja Szóstego Gracza'
    );
  }

  private pickPrimaryCategory(terms: WpTerm[]): WpTerm | undefined {
    const categories = terms.filter((term) => term.taxonomy === 'category');
    const preferred = categories.find((term) => !['aktualnosci', 'featured'].includes(term.slug));

    return preferred ?? categories[0];
  }

  private pickPrimaryTerm(
    terms: WpTerm[],
    label: string,
    fallbackCategory?: WpTerm,
  ): WpTerm | undefined {
    const normalizedLabel = this.normalizeTerm(label);
    const candidates = terms.filter(
      (term) => term.taxonomy === 'post_tag' || term.taxonomy === 'category',
    );
    const matchingTag = candidates.find(
      (term) => term.taxonomy === 'post_tag' && this.normalizeTerm(term.name) === normalizedLabel,
    );
    const matchingCategory = candidates.find(
      (term) =>
        term.taxonomy === 'category' &&
        term.slug !== 'featured' &&
        this.normalizeTerm(term.name) === normalizedLabel,
    );

    return matchingTag ?? matchingCategory ?? fallbackCategory;
  }

  private categoryFromTitle(title: string): string | undefined {
    const prefix = title.split(':')[0]?.trim();

    return prefix && prefix.length <= 18 ? prefix : undefined;
  }

  private pickTagsContainingTeamName(tags: WpTerm[], teamName: string): WpTerm[] {
    const normalizedTeamName = this.normalizeTerm(teamName);

    return tags.filter((tag) => {
      const normalizedName = this.normalizeTerm(tag.name);
      const normalizedSlug = this.normalizeTerm(tag.slug);

      return (
        normalizedName.includes(normalizedTeamName) || normalizedSlug.includes(normalizedTeamName)
      );
    });
  }

  private normalizeTerm(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private cleanCommentHtml(value: string): string {
    return value.replace(/<div class="cld-like-dislike-wrap[\s\S]*?<\/div>\s*<\/div>/g, '').trim();
  }

  private cleanText(value: string): string {
    const withoutTags = value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return this.decodeHtml(withoutTags);
  }

  private decodeHtml(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;

    return textarea.value;
  }
}
