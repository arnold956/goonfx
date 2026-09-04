const { cors, publicWs } = require('../lib/deriv');
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const d = await publicWs({ active_symbols: 'brief' });
    return res.json({ keys: Object.keys(d || {}), active_symbols_type: Array.isArray(d?.active_symbols) ? 'array' : typeof d?.active_symbols, active_symbols_count: Array.isArray(d?.active_symbols) ? d.active_symbols.length : null, data_type: Array.isArray(d?.data) ? 'array' : typeof d?.data, data_count: Array.isArray(d?.data) ? d.data.length : null, sample_keys: d?.active_symbols?.[0] ? Object.keys(d.active_symbols[0]) : null, error: d?.error || null });
  } catch (e) { return res.status(502).json({ error: e.message }); }
};
