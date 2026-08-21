# GOON FX PRO — Deriv OAuth Gateway

## Files

- `GOON-FX-PRO-V2.5-DERIV.html` — updated GOON FX PRO frontend with the existing design, Deriv OAuth configuration, live ticks, and Manual Trader.
- `goonfx-oauth-gateway-worker.js` — server-side OAuth authorization-code exchange gateway.
- `wrangler.toml` — Cloudflare Worker deployment configuration.

## Required Deriv OAuth registration

Register this exact redirect URI in the Deriv OAuth application:

`https://goonfx.com/`

Client ID configured in the frontend/gateway:

`34b2ctEChXoL5t579q8pB`

The frontend uses:

- Authorization: `https://auth.deriv.com/oauth2/auth`
- Token exchange gateway: `https://goonfx.com/oauth/exchange`
- Deriv REST API: `https://api.derivws.com`
- Public WebSocket: `wss://api.derivws.com/trading/v1/options/ws/public`

## Cloudflare Worker deployment

1. Deploy `goonfx-oauth-gateway-worker.js`.
2. Set the Worker secret:
   `wrangler secret put DERIV_CLIENT_ID`
3. Enter:
   `34b2ctEChXoL5t579q8pB`
4. Route the Worker on `goonfx.com/oauth/*`.
5. Serve `GOON-FX-PRO-V2.5-DERIV.html` at `https://goonfx.com/`.

The browser never receives a Deriv client secret. The authorization-code exchange is performed by the Worker.

## Manual Trader

The existing GOON FX PRO Manual Trader is wired for:

- live market selection
- live tick display
- Rise / Fall
- stake
- ticks or seconds
- live proposal/payout
- authenticated buy
- open-contract monitoring
- early sell where Deriv permits it

Deriv account authentication is required before a trade can be purchased.
