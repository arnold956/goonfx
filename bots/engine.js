export class BotEngine {
  constructor(apiBase,onEvent){this.apiBase=apiBase;this.onEvent=onEvent||(()=>{});this.ws=null;this.running=false;this.last=null;this.contracts=new Set();this.totalStake=0;}
  async connect(accountId){
    const r=await fetch(this.apiBase+'/api/trading/otp',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({account_id:accountId})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.url) throw new Error(d.error||'Could not create authenticated Deriv session');
    this.ws=new WebSocket(d.url);
    await new Promise((resolve,reject)=>{
      const t=setTimeout(()=>{try{this.ws.close()}catch{};reject(new Error('Deriv trading connection timeout'))},10000);
      this.ws.onopen=()=>{clearTimeout(t);resolve()};
      this.ws.onerror=()=>{clearTimeout(t);reject(new Error('Deriv trading connection failed'))};
    });
    this.ws.onmessage=e=>this.handle(JSON.parse(e.data));
    this.ws.onclose=()=>this.onEvent({type:'disconnected'});
  }
  send(x){if(!this.ws||this.ws.readyState!==1)throw new Error('Deriv trading connection is not ready');this.ws.send(JSON.stringify(x));}
  subscribe(symbol){this.send({ticks:symbol,subscribe:1,req_id:10});}
  handle(d){
    if(d.error){this.onEvent({type:'error',message:d.error.message,code:d.error.code});return;}
    if(d.msg_type==='tick'){const q=Number(d.tick.quote);const previous=this.last;this.last=q;this.onEvent({type:'tick',quote:q,previous});}
    if(d.msg_type==='buy'&&d.buy){this.contracts.add(String(d.buy.contract_id));this.onEvent({type:'buy',contract:d.buy});this.send({proposal_open_contract:1,contract_id:d.buy.contract_id,subscribe:1,req_id:Date.now()%1000000});}
    if(d.msg_type==='proposal_open_contract'&&d.proposal_open_contract)this.onEvent({type:'contract',contract:d.proposal_open_contract});
  }
  proposal(params){this.send({...params,proposal:1,subscribe:1,req_id:Date.now()%1000000});}
  buy(proposalId,price){this.send({buy:String(proposalId),price:Number(price),req_id:Date.now()%1000000});}
  sell(contractId,price=0){this.send({sell:Number(contractId),price:Number(price),req_id:Date.now()%1000000});}
  stop(){this.running=false;try{if(this.ws&&this.ws.readyState===1)this.ws.close()}catch{};this.onEvent({type:'stopped'});}
}
