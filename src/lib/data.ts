import { Stock, Holding, Player, Trade, User } from './types';

export const STOCKS: Stock[] = [
  { ticker: 'NVDA', name: 'NVIDIA Corp',          price: 890.50,  chg: +4.25,  sector: 'Technology',             vol: '82.4M' },
  { ticker: 'ORCL', name: 'Oracle Corp',           price: 148.08,  chg: -8.46,  sector: 'Technology',             vol: '14.2M' },
  { ticker: 'MSFT', name: 'Microsoft Corp',        price: 248.12,  chg: -7.38,  sector: 'Technology',             vol: '28.1M' },
  { ticker: 'MU',   name: 'Micron Technology',     price: 428.17,  chg: +3.38,  sector: 'Technology',             vol: '11.5M' },
  { ticker: 'JPM',  name: 'JPMorgan Chase & Co',   price: 310.80,  chg: +1.20,  sector: 'Financials',             vol: '9.7M'  },
  { ticker: 'BAC',  name: 'Bank of America Corp',  price: 54.12,   chg: +0.70,  sector: 'Financials',             vol: '44.3M' },
  { ticker: 'LLY',  name: 'Eli Lilly and Co',      price: 1180.50, chg: +13.20, sector: 'Health Care',            vol: '3.6M'  },
  { ticker: 'NVO',  name: 'Novo Nordisk A/S',      price: 50.20,   chg: +16.23, sector: 'Health Care',            vol: '6.1M'  },
  { ticker: 'AAPL', name: 'Apple Inc',             price: 213.49,  chg: +0.85,  sector: 'Technology',             vol: '55.8M' },
  { ticker: 'GOOG', name: 'Alphabet Inc',          price: 175.30,  chg: -1.20,  sector: 'Technology',             vol: '19.4M' },
  { ticker: 'AMZN', name: 'Amazon.com Inc',        price: 198.72,  chg: +2.10,  sector: 'Consumer Discretionary', vol: '31.2M' },
  { ticker: 'META', name: 'Meta Platforms Inc',    price: 531.60,  chg: +1.55,  sector: 'Technology',             vol: '14.9M' },
  { ticker: 'TSLA', name: 'Tesla Inc',             price: 282.40,  chg: -3.40,  sector: 'Consumer Discretionary', vol: '98.2M' },
  { ticker: 'GS',   name: 'Goldman Sachs Group',   price: 498.10,  chg: +0.90,  sector: 'Financials',             vol: '3.1M'  },
  { ticker: 'PFE',  name: 'Pfizer Inc',            price: 27.40,   chg: -0.60,  sector: 'Health Care',            vol: '29.5M' },
];

export const INITIAL_HOLDINGS: Holding[] = [
  { ticker: 'NVDA', shares: 20,  avgCost: 710.00 },
  { ticker: 'ORCL', shares: 15,  avgCost: 130.00 },
  { ticker: 'MSFT', shares: 30,  avgCost: 280.00 },
  { ticker: 'MU',   shares: 10,  avgCost: 390.00 },
  { ticker: 'JPM',  shares: 8,   avgCost: 285.00 },
  { ticker: 'BAC',  shares: 100, avgCost: 48.00  },
  { ticker: 'LLY',  shares: 2,   avgCost: 980.00 },
  { ticker: 'NVO',  shares: 40,  avgCost: 38.00  },
];

export const LEADERBOARD: Player[] = [
  { name: 'Gahan',   ret: +34.2, sharpe: 1.85, vol: 12.4, delta:  0 },
  { name: 'Zach',    ret: +31.5, sharpe: 1.71, vol: 13.8, delta: +3 },
  { name: 'Shloka',  ret: +27.8, sharpe: 1.42, vol: 11.2, delta: +1 },
  { name: 'Pablo',   ret: +24.1, sharpe: 1.30, vol: 14.7, delta: +2 },
  { name: 'Shreya',  ret: +19.6, sharpe: 1.58, vol:  8.9, delta:  0 },
  { name: 'Rio',     ret: +15.3, sharpe: 1.12, vol: 15.6, delta: +1 },
  { name: 'Vanessa', ret: +11.8, sharpe: 0.98, vol: 17.3, delta: -3 },
  { name: 'Nathan',  ret:  +8.4, sharpe: 0.82, vol: 19.1, delta:  0 },
  { name: 'Issa',    ret:  +5.2, sharpe: 0.71, vol: 21.4, delta: -1 },
];

export const INITIAL_HISTORY: Trade[] = [
  { date: '2026-03-28', ticker: 'LLY',  side: 'Buy',  qty: 2,   price: 1180.50 },
  { date: '2026-03-25', ticker: 'NVO',  side: 'Buy',  qty: 40,  price: 38.00   },
  { date: '2026-03-20', ticker: 'ORCL', side: 'Sell', qty: 5,   price: 162.40  },
  { date: '2026-03-14', ticker: 'NVDA', side: 'Buy',  qty: 20,  price: 710.00  },
  { date: '2026-03-10', ticker: 'BAC',  side: 'Buy',  qty: 100, price: 48.00   },
  { date: '2026-03-07', ticker: 'MSFT', side: 'Sell', qty: 10,  price: 310.50  },
  { date: '2026-02-28', ticker: 'JPM',  side: 'Buy',  qty: 8,   price: 285.00  },
  { date: '2026-02-20', ticker: 'MSFT', side: 'Buy',  qty: 40,  price: 280.00  },
  { date: '2026-02-15', ticker: 'MU',   side: 'Buy',  qty: 10,  price: 390.00  },
  { date: '2026-02-10', ticker: 'ORCL', side: 'Buy',  qty: 20,  price: 130.00  },
];

export const MOCK_USERS: User[] = [
  { email: 'shloka@tamid.org', password: 'tamid123', name: 'Shloka' },
  { email: 'demo@tamid.org',   password: 'demo',     name: 'Demo User' },
];

export const CHART_LABELS = ['Jan 6', 'Jan 20', 'Feb 3', 'Feb 17', 'Mar 3', 'Mar 17', 'Mar 29'];
export const PORTFOLIO_VALUES = [100000, 103200, 107800, 104500, 112000, 121500, 127800];
export const SP500_VALUES     = [100000, 101500, 103000, 101800, 105200, 111000, 113300];

export function getStock(ticker: string): Stock | undefined {
  return STOCKS.find(s => s.ticker === ticker);
}

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}
