const { cors, publicWs } = require('../lib/deriv');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const d = await publicWs({ active_symbols: 'brief' });
    const raw = Array.isArray(d.active_symbols) ? d.active_symbols : [];
    const markets = raw.map(x => ({
      symbol: x.symbol || x.underlying_symbol,
      display: x.display_name || x.underlying_symbol_name || x.symbol || x.underlying_symbol,
      type: x.symbol_type || x.underlying_symbol_type,
      pip_size: x.pip_size ?? x.pip
    })).filter(x => x.symbol);
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    return res.json({ markets });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
