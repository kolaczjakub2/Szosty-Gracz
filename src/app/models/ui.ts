export interface NavItem {
  label: string;
  id: number;
  name: string;
  slug: string;
  taxonomy: 'category' | 'post_tag';
  path?: string;
}

export interface TeamFilter {
  code: string;
  name: string;
  logoUrl: string;
}
