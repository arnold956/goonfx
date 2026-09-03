const { CLIENT_ID, CLIENT_SECRET, requireConfig, setSession, cors, jsonBody } = require('../../lib/deriv');

module.exports = async (req,res)=>{
  cors(res); if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    requireConfig(); const b=await jsonBody(req);
    if(!b.code || !b.code_verifier || !b.redirect_uri) return res.status(400).json({error:'Missing OAuth callback parameters'});
    const form=new URLSearchParams({grant_type:'authorization_code',code:b.code,redirect_uri:b.redirect_uri,client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code_verifier:b.code_verifier});
    const r=await fetch('https://auth.deriv.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const d=await r.json().catch(()=>({})); if(!r.ok || !d.access_token) return res.status(401).json({error:d.error_description||d.error||'Deriv authorization failed'});
    setSession(res,d.access_token); return res.status(200).json({ok:true});
  }catch(e){return res.status(500).json({error:e.message||'OAuth exchange failed'});}
};
