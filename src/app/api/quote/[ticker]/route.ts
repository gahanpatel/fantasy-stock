import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbFetchedAt = 0;
const CRUMB_TTL = 25 * 60 * 1000; // 25 minutes

async function fetchFreshCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  try {
    const consentRes = await fetch('https://fc.yahoo.com/', {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    const rawCookies = consentRes.headers.getSetCookie?.() ?? [];
    const cookie = rawCookies.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');

    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes('{') || crumb.length > 20) return null;

    cachedCrumb = crumb;
    cachedCookie = cookie;
    crumbFetchedAt = Date.now();
    return { crumb, cookie };
  } catch {
    return null;
  }
}

async function getCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (cachedCrumb && cachedCookie && Date.now() - crumbFetchedAt < CRUMB_TTL) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  cachedCrumb = null;
  cachedCookie = null;
  return fetchFreshCrumb();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    const auth = await getCrumb();
    const headers = { 'User-Agent': UA, ...(auth ? { Cookie: auth.cookie } : {}) };
    const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';

    const [chartRes, summaryRes] = await Promise.all([
      fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d${crumbParam}`,
        { headers }
      ),
      fetch(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2Cprice${crumbParam}`,
        { headers }
      ),
    ]);

    if (!chartRes.ok) throw new Error('Yahoo Finance returned ' + chartRes.status);

    const chartJson = await chartRes.json();
    const meta = chartJson?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No data for ' + ticker);

    const price     = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const change    = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    // Fallbacks from chart meta
    let marketCap: number | null     = null;
    let beta: number | null          = null;
    let peRatio: number | null       = null;
    let forwardPE: number | null     = null;
    let eps: number | null           = null;
    let week52High: number | null    = meta.fiftyTwoWeekHigh ?? null;
    let week52Low: number | null     = meta.fiftyTwoWeekLow ?? null;
    let avgVolume: number | null     = meta.averageDailyVolume3Month ?? meta.averageDailyVolume10Day ?? null;
    let dividendYield: number | null = null;
    let priceToBook: number | null   = null;

    let summaryResFinal = summaryRes;
    // If unauthorized, clear crumb and retry once with a fresh one
    if (!summaryRes.ok || summaryRes.status === 401 || summaryRes.status === 403) {
      cachedCrumb = null;
      cachedCookie = null;
      const freshAuth = await fetchFreshCrumb();
      if (freshAuth) {
        const retryHeaders = { 'User-Agent': UA, Cookie: freshAuth.cookie };
        summaryResFinal = await fetch(
          `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2Cprice&crumb=${encodeURIComponent(freshAuth.crumb)}`,
          { headers: retryHeaders }
        );
      }
    }

    if (summaryResFinal.ok) {
      const sj = await summaryResFinal.json();
      const r  = sj?.quoteSummary?.result?.[0];
      const sd = r?.summaryDetail;
      const ks = r?.defaultKeyStatistics;
      const fd = r?.financialData;
      const pr = r?.price;

      if (sd) {
        marketCap     = sd.marketCap?.raw ?? null;
        beta          = sd.beta?.raw ?? null;
        peRatio       = sd.trailingPE?.raw ?? null;
        forwardPE     = sd.forwardPE?.raw ?? null;
        week52High    = sd.fiftyTwoWeekHigh?.raw ?? week52High;
        week52Low     = sd.fiftyTwoWeekLow?.raw ?? week52Low;
        avgVolume     = sd.averageVolume?.raw ?? avgVolume;
        dividendYield = sd.dividendYield?.raw ? Math.round(sd.dividendYield.raw * 10000) / 100 : null;
      }
      if (ks) {
        eps         = ks.trailingEps?.raw ?? null;
        priceToBook = ks.priceToBook?.raw ?? null;
        if (!beta)      beta      = ks.beta?.raw ?? null;
        if (!forwardPE) forwardPE = ks.forwardPE?.raw ?? null;
      }
      if (fd) {
        if (!peRatio) peRatio = fd.trailingPE?.raw ?? null;
      }
      if (pr) {
        if (!marketCap) marketCap = pr.marketCap?.raw ?? null;
        if (!peRatio)   peRatio   = pr.trailingPE?.raw ?? null;
        if (!beta)      beta      = pr.beta?.raw ?? null;
      }
    }

    return NextResponse.json({
      ticker:         ticker.toUpperCase(),
      name:           meta.longName ?? meta.shortName ?? ticker,
      price:          Math.round(price * 100) / 100,
      change:         Math.round(change * 100) / 100,
      change_percent: Math.round(changePct * 100) / 100,
      market_cap:     marketCap,
      beta,
      pe_ratio:       peRatio,
      forward_pe:     forwardPE,
      eps,
      week_52_high:   week52High,
      week_52_low:    week52Low,
      avg_volume:     avgVolume,
      dividend_yield: dividendYield,
      price_to_book:  priceToBook,
    });
  } catch (e) {
    cachedCrumb = null;
    cachedCookie = null;
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
