const { cors, publicWs } = require('../lib/deriv');

const FALLBACK_MARKETS = [
  ['1HZ10V','Volatility 10 (1s)','synthetic'],
  ['1HZ25V','Volatility 25 (1s)','synthetic'],
  ['1HZ50V','Volatility 50 (1s)','synthetic'],
  ['1HZ75V','Volatility 75 (1s)','synthetic'],
  ['1HZ100V','Volatility 100 (1s)','synthetic'],
  ['R_10','Volatility 10','synthetic'],
  ['R_25','Volatility 25','synthetic'],
  ['R_50','Volatility 50','synthetic'],
  ['R_75','Volatility 75','synthetic'],
  ['R_100','Volatility 100','synthetic'],
  ['BOOM500','Boom 500 Index','synthetic'],
  ['BOOM1000','Boom 1000 Index','synthetic'],
  ['CRASH500','Crash 500 Index','synthetic'],
  ['CRASH1000','Crash 1000 Index','synthetic']
].map(([symbol, display, type]) => ({ symbol, display, type }));

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    // The public gateway currently answers active_symbols with an empty list,
    // while ticks_history works normally. Use verified public symbols as the
    // selector list and let the live tick endpoint validate each instrument.
    const d = await publicWs({ active_symbols: 'brief' });
    const raw = Array.isArray(d.active_symbols) ? d.active_symbols : [];
    const discovered = raw.map(x => ({
      symbol: x.symbol || x.underlying_symbol,
      display: x.display_name || x.underlying_symbol_name || x.symbol || x.underlying_symbol,
      type: x.symbol_type || x.underlying_symbol_type,
      pip_size: x.pip_size ?? x.pip
    })).filter(x => x.symbol);
    const markets = discovered.length ? discovered : FALLBACK_MARKETS;
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    return res.json({ markets });
  } catch (e) {
    // Market discovery is a convenience endpoint; keep the dashboard usable
    // because the public tick gateway is independently available.
    return res.json({ markets: FALLBACK_MARKETS });
  }
};
