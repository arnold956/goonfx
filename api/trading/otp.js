const { getToken, derivRest, cors, jsonBody } = require('../../lib/deriv');

module.exports=async(req,res)=>{
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const token=getToken(req);
  if(!token) return res.status(401).json({error:'Not connected to Deriv'});
  try{
    const body=await jsonBody(req);
    const accountId=body.account_id;
    if(!accountId) return res.status(400).json({error:'account_id is required'});
    const d=await derivRest(`/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,token,{method:'POST',body:'{}'});
    const url=d.data?.url||d.url;
    if(!url) return res.status(502).json({error:'Deriv did not return an authenticated trading WebSocket URL'});
    return res.json({url});
  }catch(e){return res.status(502).json({error:e.message});}
};
