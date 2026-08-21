/**
 * GOON FX PRO — Deriv OAuth Gateway
 *
 * Deploy this file as a Cloudflare Worker and route:
 *   https://goonfx.com/oauth/*
 *
 * Required Worker secret/variable:
 *   DERIV_CLIENT_ID = 34b2ctEChXoL5t579q8pB
 *
 * No Deriv password, OAuth token, or client secret belongs in the HTML.
 * The token exchange is performed server-side.
 */

const ALLOWED_ORIGIN = "https://goonfx.com";
const DERIV_TOKEN_URL = "https://auth.deriv.com/oauth2/token";
const EXPECTED_REDIRECT_URI = "https://goonfx.com/";

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/oauth/health" && request.method === "GET") {
      return json({ ok: true, service: "GOON FX PRO OAuth Gateway" }, 200, origin);
    }

    if (url.pathname !== "/oauth/exchange" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, origin);
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin);
    }

    const code = String(body.code || "");
    const codeVerifier = String(body.code_verifier || "");
    const redirectUri = String(body.redirect_uri || "");
    const clientId = String(body.client_id || "");

    if (!code || !codeVerifier || !redirectUri || !clientId) {
      return json({ error: "Missing OAuth parameters" }, 400, origin);
    }

    const configuredClientId = String(env.DERIV_CLIENT_ID || "");
    if (!configuredClientId || clientId !== configuredClientId) {
      return json({ error: "Invalid OAuth client ID" }, 400, origin);
    }

    if (redirectUri !== EXPECTED_REDIRECT_URI) {
      return json({ error: "Invalid redirect URI" }, 400, origin);
    }

    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: configuredClientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: EXPECTED_REDIRECT_URI,
    });

    try {
      const upstream = await fetch(DERIV_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: form.toString(),
      });

      const text = await upstream.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text || "Deriv returned a non-JSON response" };
      }

      if (!upstream.ok) {
        return json(
          { error: data.error_description || data.error || "Deriv token exchange failed" },
          upstream.status,
          origin
        );
      }

      // Return only the short-lived OAuth token response fields needed by the app.
      return json(
        {
          access_token: data.access_token,
          token_type: data.token_type || "Bearer",
          expires_in: data.expires_in,
        },
        200,
        origin
      );
    } catch (err) {
      return json({ error: "Gateway could not reach Deriv" }, 502, origin);
    }
  },
};
