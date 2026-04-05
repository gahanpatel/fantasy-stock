import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }, // cache for 60s
    });

    if (!res.ok) throw new Error('Yahoo Finance returned ' + res.status);

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No data for ' + ticker);

    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const change = price - prevClose;
    const changePct = (change / prevClose) * 100;

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      change_percent: Math.round(changePct * 100) / 100,
      name: meta.longName ?? meta.shortName ?? ticker,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
