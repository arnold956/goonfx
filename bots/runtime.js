import {BotEngine} from './engine.js';

const API=(window.GOONFX_CONFIG?.BACKEND_URL||location.origin).replace(/\/$/,'');

function digitFromQuote(quote) {
  const s = String(quote);
  const digits = s.replace(/\D/g, '');
  return Number(digits.slice(-1));
}

export async function startBot({bot,accountId,symbol,currency='USD',stake=1,duration=5,durationUnit='t',barrier=5,multiplier=10,maxStake=20,onEvent}) {
  if (!bot || !accountId || !symbol) throw new Error('Bot, account and market are required');
  const engine = new BotEngine(API, onEvent);
  await engine.connect(accountId);
  engine.subscribe(symbol);

  let spent = 0;
  let lastTradeAt = 0;
  let pending = false;
  const digitCounts = Array(10).fill(0);
  const history = [];

  const onMessage = ev => {
    let d;
    try { d = JSON.parse(ev.data); } catch { return; }
    if (d.msg_type !== 'proposal') return;
    pending = false;
    const p = d.proposal;
    if (!p?.id) return;
    const ask = Number(p.ask_price);
    if (!Number.isFinite(ask) || ask <= 0) {
      onEvent?.({type:'error', message:'Deriv returned an invalid proposal price'});
      return;
    }
    if (spent + ask > maxStake) {
      onEvent?.({type:'risk', message:`Session stake limit reached (${maxStake})`});
      return;
    }
    spent += ask;
    engine.buy(p.id, ask);
    onEvent?.({type:'submitted', stake:ask, proposal:p});
  };
  engine.ws.addEventListener('message', onMessage);

  const original = engine.onEvent;
  engine.onEvent = e => {
    original(e);
    if (e.type === 'contract') onEvent?.({type:'contract', contract:e.contract});
    if (e.type !== 'tick' || !engine.running || pending) return;

    const now = Date.now();
    const cooldown = durationUnit === 't' ? 1200 : 3000;
    if (now - lastTradeAt < Math.max(cooldown, 1000)) return;

    const digit = digitFromQuote(e.quote);
    digitCounts[digit] += 1;
    history.push({quote:e.quote, digit});
    if (history.length > 200) history.shift();

    const total = digitCounts.reduce((a,b)=>a+b,0) || 1;
    const even = digitCounts.filter((_,i)=>i%2===0).reduce((a,b)=>a+b,0);
    const odd = total - even;
    const hotDigit = digitCounts.indexOf(Math.max(...digitCounts));
    const ctx = {
      last:e.quote,
      previous:e.previous,
      lastDigit:digit,
      hotDigit,
      barrier:Number(barrier),
      evenPct:(even/total)*100,
      oddPct:(odd/total)*100,
      digitCounts:[...digitCounts],
      history:[...history]
    };

    let choice;
    try { choice = bot.choose(ctx); } catch (err) {
      onEvent?.({type:'error', message:err.message || 'Bot strategy failed'});
      return;
    }

    const params = {
      amount:Number(stake),
      basis:'stake',
      currency,
      duration:Number(duration),
      duration_unit:durationUnit,
      underlying_symbol:symbol
    };

    if (bot.contract === 'DIGITOVER') {
      params.contract_type = choice === 'over' ? 'DIGITOVER' : 'DIGITUNDER';
      params.barrier = Number(barrier);
    } else if (bot.contract === 'DIGITEVEN') {
      params.contract_type = choice === 'even' ? 'DIGITEVEN' : 'DIGITODD';
      params.barrier = Number(barrier);
    } else if (bot.contract === 'CALL') {
      params.contract_type = choice === 'rise' ? 'CALL' : 'PUT';
    } else if (bot.contract === 'MULTUP') {
      params.contract_type = 'MULTUP';
      params.multiplier = Number(multiplier);
    } else {
      onEvent?.({type:'error', message:`Unsupported Deriv contract type: ${bot.contract}`});
      engine.stop();
      return;
    }

    pending = true;
    lastTradeAt = now;
    onEvent?.({type:'signal', choice, context:ctx, contract_type:params.contract_type});
    engine.proposal(params);
  };

  engine.running = true;
  onEvent?.({type:'started', bot:bot.id, symbol, accountId});
  return engine;
}
