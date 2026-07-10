export interface WpRenderedText {
  rendered: string;
}

export interface WpMediaSize {
  source_url: string;
}

export interface WpFeaturedMedia {
  source_url: string;
  alt_text?: string;
  media_details?: {
    sizes?: {
      medium_large?: WpMediaSize;
      large?: WpMediaSize;
      full?: WpMediaSize;
      td_696x0?: WpMediaSize;
    };
  };
}

export interface WpTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface WpPost {
  id: number;
  author: number;
  date: string;
  link: string;
  title: WpRenderedText;
  excerpt: WpRenderedText;
  content?: WpRenderedText;
  categories: number[];
  _embedded?: {
    author?: Array<{
      name: string;
    }>;
    'wp:featuredmedia'?: WpFeaturedMedia[];
    'wp:term'?: WpTerm[][];
  };
}

export interface WpComment {
  id: number;
  author_name: string;
  date: string;
  content: WpRenderedText;
  parent: number;
}

export interface Article {
  id: number;
  title: string;
  excerpt: string;
  link: string;
  date: Date;
  imageUrl: string;
  imageAlt: string;
  category: string;
  primaryTerm?: ArticleTerm;
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  totalPages: number;
  page: number;
}

export interface ArticleTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface ArticleTag extends ArticleTerm {
  taxonomy: 'post_tag';
}

export interface ArticleDetail extends Article {
  authorName: string;
  contentHtml: string;
  tags: ArticleTag[];
}

export interface ArticleComment {
  id: number;
  authorName: string;
  date: Date;
  contentHtml: string;
  parentId: number;
  depth: number;
}

export interface ArticleDetailViewModel {
  loading: boolean;
  error?: string;
  article?: ArticleDetail;
  comments: ArticleComment[];
  commentCount: number;
}

export interface HomeViewModel {
  loading: boolean;
  error?: string;
  posts: Article[];
  hero?: Article;
  sideArticles: Article[];
  latest: Article[];
  total: number;
  totalPages: number;
  page: number;
}
