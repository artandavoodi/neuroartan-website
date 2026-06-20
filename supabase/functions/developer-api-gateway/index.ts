import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readApiKey(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";
  return authorization.slice(7).trim();
}

function normalizeRoute(pathname: string) {
  const marker = "/developer-api-gateway";
  const index = pathname.indexOf(marker);
  const route = index >= 0 ? pathname.slice(index + marker.length) : pathname;
  return route || "/";
}

function responseStatus(error: unknown) {
  if (error instanceof Error && error.message.includes("RATE_LIMIT")) return 429;
  return 500;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: "DEVELOPER_API_GATEWAY_UNCONFIGURED" }, 503);

  const secret = readApiKey(request);
  if (!secret.startsWith("na_live_") && !secret.startsWith("na_test_")) {
    return jsonResponse({ error: "INVALID_API_KEY" }, 401);
  }

  const startedAt = Date.now();
  const route = normalizeRoute(new URL(request.url).pathname);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let key: Record<string, unknown> | null = null;
  let status = 500;

  try {
    const { data, error } = await admin.rpc("resolve_developer_api_key", { p_secret: secret });
    if (error) throw error;
    key = Array.isArray(data) ? data[0] || null : data;
    if (!key?.id || !key?.owner_auth_user_id) {
      status = 401;
      return jsonResponse({ error: "INVALID_API_KEY" }, status);
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count, error: rateError } = await admin
      .from("developer_api_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", key.id)
      .gte("created_at", oneMinuteAgo);
    if (rateError) throw rateError;
    if (Number(count || 0) >= Number(key.rate_limit_per_minute || 60)) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    if (route === "/v1/models/current") {
      if (!key.model_id) {
        status = 404;
        return jsonResponse({ error: "MODEL_NOT_AVAILABLE" }, status);
      }

      const { data: model, error: modelError } = await admin
        .from("models")
        .select("id, model_slug, model_name, description, model_visibility, lifecycle_state, readiness_state, publication_state, verification_state, created_at, updated_at")
        .eq("id", key.model_id)
        .eq("owner_auth_user_id", key.owner_auth_user_id)
        .maybeSingle();
      if (modelError) throw modelError;
      if (!model) {
        status = 404;
        return jsonResponse({ error: "MODEL_NOT_AVAILABLE" }, status);
      }

      status = 200;
      return jsonResponse({ data: model }, 200);
    }

    if (route === "/v1/usage") {
      const { data: usage, error: usageError } = await admin
        .from("developer_api_usage_events")
        .select("route, method, response_status, latency_ms, input_units, output_units, cost_microunits, created_at")
        .eq("api_key_id", key.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (usageError) throw usageError;

      status = 200;
      return jsonResponse({ data: usage || [] }, 200);
    }

    status = 404;
    return jsonResponse({ error: "API_ROUTE_NOT_FOUND" }, 404);
  } catch (error) {
    status = responseStatus(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "DEVELOPER_API_GATEWAY_ERROR" }, status);
  } finally {
    if (key?.id && key?.owner_auth_user_id) {
      const latency = Date.now() - startedAt;
      try {
        await admin.from("developer_api_usage_events").insert({
          api_key_id: key.id,
          owner_auth_user_id: key.owner_auth_user_id,
          route,
          method: request.method,
          response_status: status,
          latency_ms: latency,
        });
        await admin.from("developer_api_keys")
          .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", key.id)
          .eq("owner_auth_user_id", key.owner_auth_user_id);
      } catch (_) {
        // Usage telemetry must not alter the protected API response.
      }
    }
  }
});
