import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { catchError, defer, forkJoin, map, of, switchMap, type Observable } from 'rxjs';

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

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const POST_LIST_FIELDS = [
  'id',
  'slug',
  'date',
  'link',
  'title',
  'excerpt',
  'categories',
  'featured_media',
  '_links',
  '_embedded',
].join(',');
const EVERGREEN_ARCHIVE_CATEGORY_IDS = [
  1579, // historia
  3506, // historianba
  3505, // nineties
  878, // kultura
  3509, // ksiazki
  3510, // kino
  3511, // analityka
  790, // Playbook
  3501, // Jordan Bulls
  3503, // Kobe Bryant
  3502, // era Warriors
  3504, // LeBron James
  3512, // bójki
].join(',');
const TIME_SENSITIVE_TITLE_PREFIX = /^(?:wake-up|dniowka|dniówka|rzutowka|rzutówka|flesz|newsy?)\s*:/i;

@Injectable({
  providedIn: 'root',
})
export class Wordpress {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBase = 'https://szostygracz.pl/wp-json/wp/v2';
  private readonly authorNamesById = new Map<number, string>([
    [1, 'Adam Szczepański'],
    [2, 'Maciej Kwiatkowski'],
    [1020, 'Sebastian Bielas'],
    [1980, 'Kwiatkowski & Szczepański'],
  ]);
  private readonly authorAvatarsById = new Map<number, string>([
    [1, '/team-adam-szczepanski-avatar.jpg'],
    [2, '/team-maciej-kwiatkowski.jpg'],
    [1980, '/team-adam-szczepanski-avatar.jpg'],
  ]);
  private readonly fallbackImage =
    'https://szostygracz.pl/wp-content/uploads/2024/09/6g_2012-1.png';

  constructor(private readonly http: HttpClient) {}

  getLatestPosts(page = 1, perPage = 16): Observable<PaginatedArticles> {
    const params = this.postsParams(page, perPage).set('_sg_cb', Date.now().toString());

    return this.getPaginatedPosts(params, page);
  }

  getRandomArchivePosts(count = 4): Observable<Article[]> {
    return defer(() => {
      const before = new Date(Date.now() - 90 * DAY_IN_MILLISECONDS).toISOString();
      const countSafe = Math.max(1, Math.min(Math.trunc(count), 6));
      const countParams = new HttpParams()
        .set('per_page', 1)
        .set('before', before)
        .set('categories', EVERGREEN_ARCHIVE_CATEGORY_IDS)
        .set('_fields', 'id');

      return this.http.get<WpPost[]>(`${this.apiBase}/posts`, { params: countParams, observe: 'response' }).pipe(
        switchMap((response) => {
          const total = Number(response.headers.get('X-WP-Total') ?? 0);
          if (!total) return of([]);

          const sampleSize = Math.min(countSafe * 3, total);
          const pages = new Set<number>();
          while (pages.size < sampleSize) {
            pages.add(Math.floor(Math.random() * total) + 1);
          }

          return forkJoin([...pages].map((page) => {
            const params = new HttpParams()
              .set('per_page', 1)
              .set('page', page)
              .set('before', before)
              .set('categories', EVERGREEN_ARCHIVE_CATEGORY_IDS)
              .set('_embed', 'wp:featuredmedia,wp:term')
              .set('_fields', POST_LIST_FIELDS);
            return this.http.get<WpPost[]>(`${this.apiBase}/posts`, { params }).pipe(
              map((posts) => posts[0] ? this.toArticle(posts[0]) : null),
            );
          })).pipe(
            map((articles) => articles
              .filter((article): article is Article => Boolean(article))
              .filter((article) => !TIME_SENSITIVE_TITLE_PREFIX.test(article.title))
              .slice(0, countSafe)),
          );
        }),
      );
    });
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

  getPostsByArchiveAuthor(
    wordpressSlug: string,
    page = 1,
  ): Observable<PaginatedArticles> {
    const safePage = Math.max(Math.trunc(page), 1);
    const archiveUrl = isPlatformBrowser(this.platformId)
      ? `/api/archive-authors/${encodeURIComponent(wordpressSlug)}?page=${safePage}`
      : safePage > 1
        ? `https://szostygracz.pl/author/${encodeURIComponent(wordpressSlug)}/page/${safePage}/`
        : `https://szostygracz.pl/author/${encodeURIComponent(wordpressSlug)}/`;

    return this.http.get(archiveUrl, { responseType: 'text' }).pipe(
      switchMap((html) => {
        const archive = this.parseAuthorArchive(html, safePage);

        if (!archive.slugs.length) {
          return of({
            articles: [],
            total: archive.total,
            totalPages: archive.totalPages,
            page: safePage,
          });
        }

        const params = new HttpParams()
          .set('slug', archive.slugs.join(','))
          .set('per_page', archive.slugs.length)
          .set('_embed', 'wp:featuredmedia,wp:term')
          .set('_fields', POST_LIST_FIELDS);

        return this.http.get<WpPost[]>(`${this.apiBase}/posts`, { params }).pipe(
          map((posts) => {
            const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

            return {
              articles: archive.slugs
                .map((slug) => postsBySlug.get(slug))
                .filter((post): post is WpPost => Boolean(post))
                .map((post) => this.toArticle(post)),
              total: archive.total,
              totalPages: archive.totalPages,
              page: safePage,
            };
          }),
        );
      }),
    );
  }

  getPostDetail(postId: number): Observable<ArticleDetail> {
    const params = new HttpParams().set('_embed', '1');

    return this.http
      .get<WpPost>(`${this.apiBase}/posts/${postId}`, { params })
      .pipe(
        switchMap((post) => this.recoverFeaturedImage(post).pipe(
          map((imageUrl) => this.toArticleDetail(post, imageUrl)),
        )),
      );
  }

  getCommentsByPost(postId: number): Observable<ArticleComment[]> {
    const params = new HttpParams()
      .set('post', postId)
      .set('per_page', 50)
      .set('orderby', 'date')
      .set('order', 'asc')
      .set('_sg_cb', Date.now().toString());

    return this.http
      .get<WpComment[]>(`${this.apiBase}/comments`, { params })
      .pipe(map((comments) => this.toCommentThread(comments)));
  }

  private postsParams(page: number, perPage: number): HttpParams {
    return new HttpParams()
      .set('page', page)
      .set('per_page', perPage)
      .set('_embed', 'wp:featuredmedia,wp:term')
      .set('_fields', POST_LIST_FIELDS);
  }

  private getPaginatedPosts(params: HttpParams, page: number): Observable<PaginatedArticles> {
    return this.http
      .get<WpPost[]>(`${this.apiBase}/posts`, { params, observe: 'response' })
      .pipe(
        switchMap((response) => this.toArticles(response.body ?? []).pipe(
          map((articles) => ({
            articles,
            total: Number(response.headers.get('X-WP-Total') ?? 0),
            totalPages: Number(response.headers.get('X-WP-TotalPages') ?? 0),
            page,
          })),
        )),
      );
  }

  private toArticles(posts: WpPost[]): Observable<Article[]> {
    if (!posts.length) return of([]);

    const missingMediaIds = [
      ...new Set(
        posts
          .filter(
            (post) =>
              Boolean(post.featured_media) &&
              !post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
          )
          .map((post) => post.featured_media as number),
      ),
    ];

    if (!missingMediaIds.length) {
      return of(posts.map((post) => this.toArticle(post)));
    }

    const params = new HttpParams()
      .set('per_page', Math.min(missingMediaIds.length, 100))
      .set('include', missingMediaIds.join(','))
      .set('_fields', 'id,source_url');

    return this.http
      .get<Array<{ id: number; source_url: string }>>(`${this.apiBase}/media`, { params })
      .pipe(
        catchError(() => of([])),
        switchMap((mediaItems) => {
          const recoveredByMediaId = new Map(
            mediaItems.map((media) => [media.id, media.source_url] as const),
          );
          const unresolvedPosts = posts.filter(
            (post) =>
              Boolean(post.featured_media) &&
              !post._embedded?.['wp:featuredmedia']?.[0]?.source_url &&
              !recoveredByMediaId.has(post.featured_media as number),
          );

          if (!unresolvedPosts.length) {
            return of(
              posts.map((post) =>
                this.toArticle(post, recoveredByMediaId.get(post.featured_media as number)),
              ),
            );
          }

          return forkJoin(
            unresolvedPosts.map((post) =>
              this.recoverFeaturedImage(post).pipe(map((imageUrl) => [post.id, imageUrl] as const)),
            ),
          ).pipe(
            map((fallbackImages) => {
              const fallbackByPostId = new Map(fallbackImages);

              return posts.map((post) =>
                this.toArticle(
                  post,
                  recoveredByMediaId.get(post.featured_media as number) ??
                    fallbackByPostId.get(post.id),
                ),
              );
            }),
          );
        }),
      );
  }

  private recoverFeaturedImage(post: WpPost): Observable<string | undefined> {
    const embeddedMedia = post._embedded?.['wp:featuredmedia']?.[0];

    if (embeddedMedia?.source_url || !post.featured_media) {
      return of(undefined);
    }

    if (isPlatformBrowser(this.platformId)) {
      const params = new HttpParams().set('url', post.link);

      return this.http
        .get<{ imageUrl?: string }>('/api/post-image', { params })
        .pipe(
          map((response) => response.imageUrl),
          catchError(() => of(undefined)),
        );
    }

    return this.http.get(post.link, { responseType: 'text' }).pipe(
      map((html) => this.extractOpenGraphImage(html)),
      catchError(() => of(undefined)),
    );
  }

  private extractOpenGraphImage(html: string): string | undefined {
    const root = this.document.createElement('div');
    root.innerHTML = html;
    const imageUrl = root
      .querySelector<HTMLMetaElement>('meta[property="og:image"]')
      ?.getAttribute('content')
      ?.trim() ?? root
        .querySelector<HTMLMetaElement>('[itemprop="image"] meta[itemprop="url"]')
        ?.getAttribute('content')
        ?.trim();
    root.remove();

    return imageUrl || undefined;
  }

  private emptyPaginatedPosts(page: number): PaginatedArticles {
    return {
      articles: [],
      total: 0,
      totalPages: 0,
      page,
    };
  }

  private parseAuthorArchive(
    html: string,
    page: number,
  ): { slugs: string[]; total: number; totalPages: number } {
    const root = this.document.createElement('div');
    root.innerHTML = html;

    const slugs = Array.from(
      root.querySelectorAll<HTMLAnchorElement>('.td-ss-main-content .td_module_10 .entry-title a'),
    )
      .map((link) => link.getAttribute('href') ?? '')
      .map((href) => href.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1) ?? '')
      .filter(Boolean);
    const postCountText = root.querySelector('.td-author-post-count')?.textContent ?? '';
    const pageCountText = root.querySelector('.page-nav .pages')?.textContent ?? '';
    const total = Number(postCountText.match(/\d+/)?.[0] ?? slugs.length);
    const totalPages = Number(pageCountText.match(/z\s+(\d+)/i)?.[1] ?? (slugs.length ? 1 : 0));

    root.remove();

    return {
      slugs,
      total,
      totalPages: Math.max(totalPages, page > 1 ? page : 0),
    };
  }

  private toArticle(post: WpPost, recoveredImageUrl?: string): Article {
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    const terms = (post._embedded?.['wp:term'] ?? []).flat();
    const category = this.pickPrimaryCategory(terms);
    const title = this.cleanText(post.title.rendered);
    const titleCategory = this.categoryFromTitle(title);
    const categoryName = titleCategory ?? category?.name ?? 'Aktualności';
    const primaryTerm = this.pickPrimaryTerm(terms, categoryName, category);

    return {
      id: post.id,
      slug: post.slug || String(post.id),
      title,
      excerpt: this.cleanText(post.excerpt.rendered),
      link: post.link,
      date: new Date(post.date),
      imageUrl:
        media?.media_details?.sizes?.large?.source_url ??
        media?.media_details?.sizes?.td_696x0?.source_url ??
        media?.media_details?.sizes?.medium_large?.source_url ??
        media?.source_url ??
        recoveredImageUrl ??
        this.fallbackImage,
      thumbnailUrl:
        media?.media_details?.sizes?.medium?.source_url ??
        media?.media_details?.sizes?.thumbnail?.source_url,
      heroImageUrl:
        media?.media_details?.sizes?.full?.source_url ??
        media?.source_url ??
        recoveredImageUrl ??
        this.fallbackImage,
      imageAlt: media?.alt_text || title,
      category: categoryName,
      primaryTerm: primaryTerm ? this.toArticleTerm(primaryTerm) : undefined,
    };
  }

  private toArticleDetail(post: WpPost, recoveredImageUrl?: string): ArticleDetail {
    const article = this.toArticle(post, recoveredImageUrl);
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    const terms = (post._embedded?.['wp:term'] ?? []).flat();

    return {
      ...article,
      imageUrl:
        media?.media_details?.sizes?.full?.source_url ??
        media?.source_url ??
        article.imageUrl,
      authorName: this.pickAuthorName(post),
      authorAvatarUrl: this.authorAvatarsById.get(post.author),
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
      avatarUrl: comment.author_avatar_urls?.['96'] ?? comment.author_avatar_urls?.['48'],
      likeCount: this.commentLikeCount(comment.content.rendered),
      liked: false,
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
    const root = this.document.createElement('div');
    root.innerHTML = value;
    root.querySelectorAll('.cld-like-dislike-wrap').forEach((element) => element.remove());

    return root.innerHTML.trim();
  }

  private commentLikeCount(value: string): number {
    const match = value.match(/cld-like-count-wrap[^>]*>\s*(\d+)/i);
    return Math.max(0, Number(match?.[1] ?? 0));
  }

  private cleanText(value: string): string {
    const withoutTags = value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return this.decodeHtml(withoutTags);
  }

  private decodeHtml(value: string): string {
    const textarea = this.document.createElement('textarea');
    textarea.innerHTML = value;

    return textarea.value;
  }
}
