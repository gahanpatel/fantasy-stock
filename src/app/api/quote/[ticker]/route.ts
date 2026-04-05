import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    // Fetch price + fundamentals in parallel
    const [chartRes, summaryRes] = await Promise.all([
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      ),
      fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail,defaultKeyStatistics,price`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      ),
    ]);

    if (!chartRes.ok) throw new Error('Yahoo Finance returned ' + chartRes.status);

    const chartJson = await chartRes.json();
    const meta = chartJson?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No data for ' + ticker);

    const price     = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const change    = price - prevClose;
    const changePct = (change / prevClose) * 100;

    // Parse fundamentals (gracefully — may not always be available)
    let marketCap: number | null    = null;
    let beta: number | null         = null;
    let peRatio: number | null      = null;
    let eps: number | null          = null;
    let week52High: number | null   = null;
    let week52Low: number | null    = null;
    let avgVolume: number | null    = null;
    let dividendYield: number | null = null;
    let priceToBook: number | null  = null;
    let forwardPE: number | null    = null;

    if (summaryRes.ok) {
      const summaryJson = await summaryRes.json();
      const sd  = summaryJson?.quoteSummary?.result?.[0]?.summaryDetail;
      const ks  = summaryJson?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
      const pr  = summaryJson?.quoteSummary?.result?.[0]?.price;

      if (sd) {
        marketCap     = sd.marketCap?.raw ?? null;
        beta          = sd.beta?.raw ?? null;
        peRatio       = sd.trailingPE?.raw ?? null;
        week52High    = sd.fiftyTwoWeekHigh?.raw ?? null;
        week52Low     = sd.fiftyTwoWeekLow?.raw ?? null;
        avgVolume     = sd.averageVolume?.raw ?? null;
        dividendYield = sd.dividendYield?.raw ? Math.round(sd.dividendYield.raw * 10000) / 100 : null;
        forwardPE     = sd.forwardPE?.raw ?? null;
      }
      if (ks) {
        eps         = ks.trailingEps?.raw ?? null;
        priceToBook = ks.priceToBook?.raw ?? null;
      }
      if (pr && !peRatio) {
        peRatio = pr.trailingPE?.raw ?? null;
      }
    }

    return NextResponse.json({
      ticker:        ticker.toUpperCase(),
      name:          meta.longName ?? meta.shortName ?? ticker,
      price:         Math.round(price * 100) / 100,
      change:        Math.round(change * 100) / 100,
      change_percent: Math.round(changePct * 100) / 100,
      market_cap:    marketCap,
      beta,
      pe_ratio:      peRatio,
      forward_pe:    forwardPE,
      eps,
      week_52_high:  week52High,
      week_52_low:   week52Low,
      avg_volume:    avgVolume,
      dividend_yield: dividendYield,
      price_to_book: priceToBook,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
