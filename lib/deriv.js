const crypto = require('crypto');
const WebSocket = require('ws');

const APP_ID = process.env.DERIV_APP_ID || process.env.DERIV_CLIENT_ID;
const CLIENT_ID = process.env.DERIV_CLIENT_ID;
const CLIENT_SECRET = process.env.DERIV_CLIENT_SECRET || process.env.DERIV_OAUTH_CLIENT_SECRET;
const AUTH_BASE = 'https://auth.deriv.com';
const API_BASE = 'https://api.derivws.com';
const DERIV_WS_BASE = 'wss://ws.derivws.com/websockets/v3';
const PUBLIC_APP_ID = process.env.DERIV_MARKET_APP_ID || '1089';
const SESSION_SECRET = process.env.GOONFX_SESSION_SECRET || CLIENT_SECRET;

function requireConfig() {
  if (!CLIENT_ID || !CLIENT_SECRET || !APP_ID) throw new Error('Deriv OAuth server configuration is incomplete.');
  if (!SESSION_SECRET) throw new Error('GOONFX_SESSION_SECRET is not configured.');
}
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(x => x.trim()).filter(Boolean).map(x => { const i=x.indexOf('='); return [x.slice(0,i), decodeURIComponent(x.slice(i+1))]; }));
}
function key() { return crypto.createHash('sha256').update(SESSION_SECRET || 'missing').digest(); }
function seal(value) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}
function unseal(value) {
  try { const [iv,tag,data]=value.split('.'); const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url')); decipher.setAuthTag(Buffer.from(tag,'base64url')); return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8'); } catch { return null; }
}
function setSession(res, token) { res.setHeader('Set-Cookie', `gx_session=${encodeURIComponent(seal(token))}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600`); }
function clearSession(res) { res.setHeader('Set-Cookie','gx_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0'); }
function getToken(req) { const c=parseCookies(req); return c.gx_session ? unseal(c.gx_session) : null; }
function cors(res) {
  const origin = 'https://goonfx.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
}
async function jsonBody(req) { let body=''; for await (const chunk of req) body+=chunk; return body ? JSON.parse(body) : {}; }
async function derivRest(path, token, options={}) {
  const r=await fetch(API_BASE+path,{...options,headers:{'Authorization':`Bearer ${token}`,'Deriv-App-ID':APP_ID,'Content-Type':'application/json',...(options.headers||{})}});
  const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error?.message || d.message || `Deriv API error ${r.status}`); return d;
}
async function publicWs(request) {
  return await new Promise((resolve,reject)=>{
    const url = `${DERIV_WS_BASE}?app_id=${encodeURIComponent(PUBLIC_APP_ID)}`;
    const ws = new WebSocket(url, { handshakeTimeout: 10000 });
    const timer=setTimeout(()=>{try{ws.terminate()}catch{};reject(new Error('Deriv market data timeout'))},12000);
    ws.once('open',()=>ws.send(JSON.stringify(request)));
    ws.once('message',data=>{clearTimeout(timer);try{const d=JSON.parse(data.toString());ws.close();if(d.error)reject(new Error(d.error.message));else resolve(d)}catch(err){reject(err)}});
    ws.once('error',err=>{clearTimeout(timer);reject(new Error('Deriv market data connection failed: '+(err.message||'WebSocket error')))});
    ws.once('close',()=>clearTimeout(timer));
  });
}
module.exports={AUTH_BASE,API_BASE,APP_ID,CLIENT_ID,CLIENT_SECRET,requireConfig,parseCookies,setSession,clearSession,getToken,cors,jsonBody,derivRest,publicWs};
