import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) throw new Error('Yahoo Finance returned ' + res.status);

    const json = await res.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) throw new Error('No data for ' + ticker);

    const price     = q.regularMarketPrice ?? q.ask ?? 0;
    const prevClose = q.regularMarketPreviousClose ?? price;
    const change    = q.regularMarketChange ?? (price - prevClose);
    const changePct = q.regularMarketChangePercent ?? 0;

    // Dividend yield from Yahoo is already a percentage (e.g. 2.5 means 2.5%)
    const rawYield = q.trailingAnnualDividendYield ?? q.dividendYield ?? null;
    const dividendYield = rawYield !== null ? Math.round(rawYield * 10000) / 100 : null;

    return NextResponse.json({
      ticker:         ticker.toUpperCase(),
      name:           q.longName ?? q.shortName ?? ticker,
      price:          Math.round(price * 100) / 100,
      change:         Math.round(change * 100) / 100,
      change_percent: Math.round(changePct * 100) / 100,
      market_cap:     q.marketCap ?? null,
      beta:           q.beta ?? null,
      pe_ratio:       q.trailingPE ?? null,
      forward_pe:     q.forwardPE ?? null,
      eps:            q.epsTrailingTwelveMonths ?? null,
      week_52_high:   q.fiftyTwoWeekHigh ?? null,
      week_52_low:    q.fiftyTwoWeekLow ?? null,
      avg_volume:     q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null,
      dividend_yield: dividendYield,
      price_to_book:  q.priceToBook ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
