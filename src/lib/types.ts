export interface Stock {
  ticker: string;
  name: string;
  price: number;
  chg: number;
  sector: string;
  vol: string;
}

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
}

export interface Player {
  name: string;
  ret: number;
  sharpe: number;
  vol: number;
  delta: number;
}

export interface Trade {
  date: string;
  ticker: string;
  side: 'Buy' | 'Sell';
  qty: number;
  price: number;
}

export interface User {
  email: string;
  password: string;
  name: string;
}
