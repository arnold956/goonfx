const { clearSession, cors } = require('../lib/deriv');
module.exports=async(req,res)=>{cors(res);if(req.method==='OPTIONS')return res.status(204).end();clearSession(res);return res.json({ok:true});};
