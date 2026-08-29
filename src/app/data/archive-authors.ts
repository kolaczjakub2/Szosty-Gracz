export interface ArchiveAuthor {
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly slug: string;
  readonly wordpressSlug: string;
}

export const ARCHIVE_AUTHORS: readonly ArchiveAuthor[] = [
  {
    initials: 'MK',
    name: 'Maciej Kwiatkowski',
    role: 'Współtwórca portalu, ponad 20 lat z NBA',
    slug: 'maciej-kwiatkowski',
    wordpressSlug: 'maciej',
  },
  {
    initials: 'AS',
    name: 'Adam Szczepański',
    role: 'Współtwórca portalu, ponad 20 lat z NBA',
    slug: 'adam-szczepanski',
    wordpressSlug: 'adam',
  },
  {
    initials: 'PS',
    name: 'Piotr Sitarz',
    role: 'Analityka koszykarska',
    slug: 'piotr-sitarz',
    wordpressSlug: 'sitarzpiotrekgmail-com',
  },
  {
    initials: 'MS',
    name: 'Maciej „Wooden” Staszewski',
    role: 'Fantasy NBA',
    slug: 'maciej-staszewski',
    wordpressSlug: 'staszewski-maciekgmail-com',
  },
  {
    initials: 'MK',
    name: 'Michał Kajzerek',
    role: 'Koszykówka światowa',
    slug: 'michal-kajzerek',
    wordpressSlug: 'michalkajzerekyahoo-pl',
  },
  {
    initials: 'Z',
    name: 'zNYKający',
    role: 'Podcasty i komentarze',
    slug: 'znykajacy',
    wordpressSlug: 'znykajacy',
  },
  {
    initials: 'PK',
    name: 'Piotr Kolanowski',
    role: 'Historia NBA',
    slug: 'piotr-kolanowski',
    wordpressSlug: 'piotr-kolanowski',
  },
  {
    initials: 'PK',
    name: 'Przemek Kujawiński',
    role: 'Długie formy i historie NBA',
    slug: 'przemek-kujawinski',
    wordpressSlug: 'przemek',
  },
  {
    initials: 'SH',
    name: 'Sebastian Hetman',
    role: 'Analizy i komentarze',
    slug: 'sebastian-hetman',
    wordpressSlug: 'sebastian',
  },
  {
    initials: 'SB',
    name: 'Sebastian Bielas',
    role: 'Newsy',
    slug: 'sebastian-bielas',
    wordpressSlug: 'sebastian-bielaswp-pl',
  },
];

export function findArchiveAuthor(slug: string | null): ArchiveAuthor | null {
  return ARCHIVE_AUTHORS.find((author) => author.slug === slug) ?? null;
}
