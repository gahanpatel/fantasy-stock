import { Stock, Holding, Player, Trade, User } from './types';

export const STOCKS: Stock[] = [
  // Technology
  { ticker: 'AAPL',  name: 'Apple Inc',                   price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'MSFT',  name: 'Microsoft Corp',               price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'NVDA',  name: 'NVIDIA Corp',                  price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'GOOGL', name: 'Alphabet Inc (Class A)',        price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'GOOG',  name: 'Alphabet Inc (Class C)',        price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'META',  name: 'Meta Platforms Inc',            price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'TSLA',  name: 'Tesla Inc',                    price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'AVGO',  name: 'Broadcom Inc',                  price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'ORCL',  name: 'Oracle Corp',                   price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'CRM',   name: 'Salesforce Inc',                price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'AMD',   name: 'Advanced Micro Devices',        price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'INTC',  name: 'Intel Corp',                    price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'QCOM',  name: 'Qualcomm Inc',                  price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'TXN',   name: 'Texas Instruments',             price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'NOW',   name: 'ServiceNow Inc',                price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'SNOW',  name: 'Snowflake Inc',                 price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'PLTR',  name: 'Palantir Technologies',         price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'MU',    name: 'Micron Technology',             price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'AMAT',  name: 'Applied Materials',             price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'ADBE',  name: 'Adobe Inc',                     price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'UBER',  name: 'Uber Technologies',             price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'NET',   name: 'Cloudflare Inc',                price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'SHOP',  name: 'Shopify Inc',                   price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'SQ',    name: 'Block Inc',                     price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'COIN',  name: 'Coinbase Global',               price: 0, chg: 0, sector: 'Technology',             vol: '' },
  { ticker: 'APP',   name: 'AppLovin Corp',                 price: 0, chg: 0, sector: 'Technology',             vol: '' },
  // Consumer
  { ticker: 'AMZN',  name: 'Amazon.com Inc',                price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'HD',    name: 'Home Depot Inc',                price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'MCD',   name: "McDonald's Corp",               price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'NKE',   name: 'Nike Inc',                      price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'SBUX',  name: 'Starbucks Corp',                price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'TGT',   name: 'Target Corp',                   price: 0, chg: 0, sector: 'Consumer Discretionary', vol: '' },
  { ticker: 'WMT',   name: 'Walmart Inc',                   price: 0, chg: 0, sector: 'Consumer Staples',       vol: '' },
  { ticker: 'COST',  name: 'Costco Wholesale',              price: 0, chg: 0, sector: 'Consumer Staples',       vol: '' },
  { ticker: 'PG',    name: 'Procter & Gamble',              price: 0, chg: 0, sector: 'Consumer Staples',       vol: '' },
  { ticker: 'KO',    name: 'Coca-Cola Co',                  price: 0, chg: 0, sector: 'Consumer Staples',       vol: '' },
  { ticker: 'PEP',   name: 'PepsiCo Inc',                   price: 0, chg: 0, sector: 'Consumer Staples',       vol: '' },
  // Financials
  { ticker: 'JPM',   name: 'JPMorgan Chase & Co',           price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'V',     name: 'Visa Inc',                      price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'MA',    name: 'Mastercard Inc',                price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'BAC',   name: 'Bank of America Corp',          price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'GS',    name: 'Goldman Sachs Group',           price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'MS',    name: 'Morgan Stanley',                price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway B',          price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'WFC',   name: 'Wells Fargo & Co',              price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'AXP',   name: 'American Express Co',           price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'BLK',   name: 'BlackRock Inc',                 price: 0, chg: 0, sector: 'Financials',             vol: '' },
  { ticker: 'PYPL',  name: 'PayPal Holdings',               price: 0, chg: 0, sector: 'Financials',             vol: '' },
  // Health Care
  { ticker: 'LLY',   name: 'Eli Lilly and Co',              price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',             price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'UNH',   name: 'UnitedHealth Group',            price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'NVO',   name: 'Novo Nordisk A/S',              price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'ABBV',  name: 'AbbVie Inc',                    price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'MRK',   name: 'Merck & Co',                    price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'PFE',   name: 'Pfizer Inc',                    price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'TMO',   name: 'Thermo Fisher Scientific',      price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  { ticker: 'ISRG',  name: 'Intuitive Surgical',            price: 0, chg: 0, sector: 'Health Care',            vol: '' },
  // Energy
  { ticker: 'XOM',   name: 'Exxon Mobil Corp',              price: 0, chg: 0, sector: 'Energy',                 vol: '' },
  { ticker: 'CVX',   name: 'Chevron Corp',                  price: 0, chg: 0, sector: 'Energy',                 vol: '' },
  { ticker: 'COP',   name: 'ConocoPhillips',                price: 0, chg: 0, sector: 'Energy',                 vol: '' },
  // Industrials & Other
  { ticker: 'BA',    name: 'Boeing Co',                     price: 0, chg: 0, sector: 'Industrials',            vol: '' },
  { ticker: 'CAT',   name: 'Caterpillar Inc',               price: 0, chg: 0, sector: 'Industrials',            vol: '' },
  { ticker: 'GE',    name: 'GE Aerospace',                  price: 0, chg: 0, sector: 'Industrials',            vol: '' },
  { ticker: 'RTX',   name: 'RTX Corp',                      price: 0, chg: 0, sector: 'Industrials',            vol: '' },
  { ticker: 'UPS',   name: 'United Parcel Service',         price: 0, chg: 0, sector: 'Industrials',            vol: '' },
  // ETFs
  { ticker: 'SPY',   name: 'SPDR S&P 500 ETF',              price: 0, chg: 0, sector: 'ETF',                    vol: '' },
  { ticker: 'QQQ',   name: 'Invesco QQQ Trust',             price: 0, chg: 0, sector: 'ETF',                    vol: '' },
  { ticker: 'IWM',   name: 'iShares Russell 2000 ETF',      price: 0, chg: 0, sector: 'ETF',                    vol: '' },
  { ticker: 'DIA',   name: 'SPDR Dow Jones ETF',            price: 0, chg: 0, sector: 'ETF',                    vol: '' },
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
