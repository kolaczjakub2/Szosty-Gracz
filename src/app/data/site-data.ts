import { NavItem, TeamFilter } from '../models/ui';

export const LOGO_URL = 'https://szostygracz.pl/wp-content/uploads/2024/09/6g_2012-1.png';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'WAKE-UP', id: 2491, name: 'wake-up', slug: 'wake-up', taxonomy: 'post_tag' },
  { label: 'DNIÓWKA', id: 2141, name: 'Dniówka', slug: 'dniowka', taxonomy: 'category' },
  { label: 'RZUTÓWKA', id: 5759, name: 'Rzutówka', slug: 'rzutowka', taxonomy: 'category' },
  {
    label: 'PALMA',
    id: 1437,
    name: 'Między Rondem a Palmą',
    slug: 'miedzy-rondem-a-palma-2',
    taxonomy: 'category',
  },
  { label: 'FLESZ', id: 691, name: 'flesz', slug: 'flesz', taxonomy: 'post_tag' },
  { label: 'NEWSY', id: 62, name: 'newsy', slug: 'newsy', taxonomy: 'category' },
];

export const TEAMS: readonly TeamFilter[] = [
  {
    code: 'ATL',
    name: 'Atlanta Hawks',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/atl.png',
  },
  {
    code: 'BOS',
    name: 'Boston Celtics',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/BOS.png',
  },
  {
    code: 'BKN',
    name: 'Brooklyn Nets',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/bkn.png',
  },
  {
    code: 'CHA',
    name: 'Charlotte Hornets',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2014/05/cha.png',
  },
  {
    code: 'CHI',
    name: 'Chicago Bulls',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/CHI.gif',
  },
  {
    code: 'CLE',
    name: 'Cleveland Cavaliers',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/CLE.png',
  },
  {
    code: 'DAL',
    name: 'Dallas Mavericks',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/DAL.gif',
  },
  {
    code: 'DEN',
    name: 'Denver Nuggets',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/den.png',
  },
  {
    code: 'DET',
    name: 'Detroit Pistons',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/det.png',
  },
  {
    code: 'GSW',
    name: 'Golden State Warriors',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/gs.gif',
  },
  {
    code: 'HOU',
    name: 'Houston Rockets',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/hou.png',
  },
  {
    code: 'IND',
    name: 'Indiana Pacers',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/ind.png',
  },
  {
    code: 'LAC',
    name: 'Los Angeles Clippers',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/lac.png',
  },
  {
    code: 'LAL',
    name: 'Los Angeles Lakers',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/lak.png',
  },
  {
    code: 'MEM',
    name: 'Memphis Grizzlies',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/mem.gif',
  },
  {
    code: 'MIA',
    name: 'Miami Heat',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/mia.png',
  },
  {
    code: 'MIL',
    name: 'Milwaukee Bucks',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2015/05/mlw.gif',
  },
  {
    code: 'MIN',
    name: 'Minnesota Timberwolves',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/09/min.png',
  },
  {
    code: 'NOP',
    name: 'New Orleans Pelicans',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/06/NO.png',
  },
  {
    code: 'NYK',
    name: 'New York Knicks',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/ny.png',
  },
  {
    code: 'OKC',
    name: 'Oklahoma City Thunder',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/okc.png',
  },
  {
    code: 'ORL',
    name: 'Orlando Magic',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/orl.png',
  },
  {
    code: 'PHI',
    name: 'Philadelphia 76ers',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/phi.png',
  },
  {
    code: 'PHX',
    name: 'Phoenix Suns',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/06/pho.png',
  },
  {
    code: 'POR',
    name: 'Portland Trail Blazers',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/por.gif',
  },
  {
    code: 'SAC',
    name: 'Sacramento Kings',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/sac.png',
  },
  {
    code: 'SAS',
    name: 'San Antonio Spurs',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/sa.gif',
  },
  {
    code: 'TOR',
    name: 'Toronto Raptors',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/tor.png',
  },
  {
    code: 'UTA',
    name: 'Utah Jazz',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2024/09/uta.png',
  },
  {
    code: 'WAS',
    name: 'Washington Wizards',
    logoUrl: 'https://szostygracz.pl/wp-content/uploads/2013/02/WAS.gif',
  },
];
