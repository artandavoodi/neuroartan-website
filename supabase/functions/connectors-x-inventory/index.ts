import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const TOKEN_ENCRYPTION_SECRET = Deno.env.get("TOKEN_ENCRYPTION_SECRET") || "";
const X_CLIENT_ID = Deno.env.get("X_CLIENT_ID") || "";
const X_CLIENT_SECRET = Deno.env.get("X_CLIENT_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireEncryptionSecret() {
  if (!TOKEN_ENCRYPTION_SECRET) {
    throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
  }
  return TOKEN_ENCRYPTION_SECRET;
}

async function getEncryptionKey() {
  const secret = requireEncryptionSecret();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function encryptToken(token: string) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(token),
    ),
  );

  return `${encodeBase64(iv)}.${encodeBase64(encrypted)}`;
}

async function decryptToken(encryptedToken: string) {
  const [ivValue, encryptedValue] = encryptedToken.split(".");
  if (!ivValue || !encryptedValue) throw new Error("TOKEN_FORMAT_INVALID");

  const key = await getEncryptionKey();
  const iv = decodeBase64(ivValue);
  const encrypted = decodeBase64(encryptedValue);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );
  return new TextDecoder().decode(decrypted);
}

async function refreshXAccessToken(refreshToken: string) {
  if (!X_CLIENT_ID || !X_CLIENT_SECRET) throw new Error("X_CLIENT_ENV_MISSING");

  const credentials = btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `X_REFRESH_FAILED_${response.status}_${JSON.stringify(payload)}`,
    );
  }

  const accessToken = String(payload.access_token || "");
  if (!accessToken) throw new Error("X_REFRESH_ACCESS_TOKEN_MISSING");

  return {
    accessToken,
    refreshToken: payload.refresh_token
      ? String(payload.refresh_token)
      : refreshToken,
    expiresIn: Number.isFinite(Number(payload.expires_in))
      ? Number(payload.expires_in)
      : 0,
    scope: String(payload.scope || ""),
  };
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readMetrics(source: Record<string, unknown>) {
  return source.public_metrics && typeof source.public_metrics === "object"
    ? source.public_metrics as Record<string, unknown>
    : {};
}

function normalizeXPost(post: Record<string, unknown>) {
  const metrics = readMetrics(post);

  return {
    id: String(post.id || ""),
    provider: "x",
    source_type: "social_post",
    title: String(post.text || "").slice(0, 96),
    body: String(post.text || ""),
    text: String(post.text || ""),
    created_at: post.created_at ? String(post.created_at) : "",
    public_url: post.id ? `https://x.com/i/web/status/${String(post.id)}` : "",
    metrics: {
      retweet_count: readNumber(metrics.retweet_count),
      reply_count: readNumber(metrics.reply_count),
      like_count: readNumber(metrics.like_count),
      quote_count: readNumber(metrics.quote_count),
      bookmark_count: readNumber(metrics.bookmark_count),
      impression_count: readNumber(metrics.impression_count),
    },
    raw: post,
  };
}

function summarizeXInventory(
  xUser: Record<string, unknown>,
  posts: Record<string, unknown>[],
) {
  const publicMetrics = readMetrics(xUser);
  const tweetCount = readNumber(publicMetrics.tweet_count);
  const followersCount = readNumber(publicMetrics.followers_count);
  const followingCount = readNumber(publicMetrics.following_count);
  const listedCount = readNumber(publicMetrics.listed_count);

  return {
    inventory_type: "post",
    inventory_ready: true,
    post_count: posts.length,
    available_post_count: posts.length,
    tweet_count: tweetCount,
    followers_count: followersCount,
    following_count: followingCount,
    listed_count: listedCount,
    inventory_scanned_at: new Date().toISOString(),
  };
}

async function fetchXProfile(accessToken: string) {
  const response = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=id,name,username,created_at,description,public_metrics,verified,verified_type,profile_image_url,url",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `X_PROFILE_REQUEST_FAILED_${response.status}_${JSON.stringify(body)}`,
    );
  }

  const data = body?.data && typeof body.data === "object"
    ? body.data as Record<string, unknown>
    : null;

  if (!data?.id) throw new Error("X_PROFILE_MISSING");
  return data;
}

async function fetchXPosts(accessToken: string, userId: string) {
  const url = new URL(
    `https://api.twitter.com/2/users/${encodeURIComponent(userId)}/tweets`,
  );
  url.searchParams.set("max_results", "100");
  url.searchParams.set(
    "tweet.fields",
    "id,text,created_at,public_metrics,lang,possibly_sensitive,source,conversation_id,referenced_tweets",
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `X_POSTS_REQUEST_FAILED_${response.status}_${JSON.stringify(body)}`,
    );
  }

  return Array.isArray(body?.data)
    ? body.data.filter((item: unknown) =>
      item && typeof item === "object"
    ) as Record<string, unknown>[]
    : [];
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_ENV_MISSING");
    }

    const bearerToken = readBearerToken(request);
    if (!bearerToken) {
      return jsonResponse({ ok: false, error: "AUTHORIZATION_REQUIRED" }, 401);
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });

    const { data: userData, error: userError } = await authClient.auth
      .getUser();
    if (userError || !userData?.user?.id) {
      return jsonResponse({ ok: false, error: "USER_NOT_AUTHENTICATED" }, 401);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokenRecord, error: tokenError } = await serviceClient
      .from("connector_token_vault")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("connector_service", "x")
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenRecord?.encrypted_access_token) {
      return jsonResponse({ ok: false, error: "X_NOT_CONNECTED" }, 404);
    }

    let accessToken = await decryptToken(
      String(tokenRecord.encrypted_access_token),
    );
    let tokenRefreshed = false;
    let xUser: Record<string, unknown>;
    let posts: Record<string, unknown>[];

    try {
      xUser = await fetchXProfile(accessToken);
      posts = await fetchXPosts(accessToken, String(xUser.id));
    } catch (xError) {
      const message = xError instanceof Error ? xError.message : "";
      const shouldRefresh = message.includes("_401_");
      if (!shouldRefresh || !tokenRecord.encrypted_refresh_token) throw xError;

      const refreshToken = await decryptToken(
        String(tokenRecord.encrypted_refresh_token),
      );
      const refreshedToken = await refreshXAccessToken(refreshToken);
      accessToken = refreshedToken.accessToken;
      tokenRefreshed = true;

      const tokenMetadata =
        tokenRecord.metadata && typeof tokenRecord.metadata === "object"
          ? tokenRecord.metadata as Record<string, unknown>
          : {};

      const expiresAt = refreshedToken.expiresIn > 0
        ? new Date(Date.now() + refreshedToken.expiresIn * 1000).toISOString()
        : tokenRecord.expires_at;

      const { error: tokenUpdateError } = await serviceClient
        .from("connector_token_vault")
        .update({
          encrypted_access_token: await encryptToken(
            refreshedToken.accessToken,
          ),
          encrypted_refresh_token: await encryptToken(
            refreshedToken.refreshToken,
          ),
          expires_at: expiresAt,
          scope: refreshedToken.scope || tokenRecord.scope || "",
          metadata: {
            ...tokenMetadata,
            refreshed_at: new Date().toISOString(),
            refresh_owner: "connectors-x-inventory",
          },
        })
        .eq("id", tokenRecord.id);

      if (tokenUpdateError) throw tokenUpdateError;

      xUser = await fetchXProfile(accessToken);
      posts = await fetchXPosts(accessToken, String(xUser.id));
    }

    const normalizedPosts = posts.map(normalizeXPost);
    const inventory = {
      ...summarizeXInventory(xUser, posts),
      token_refreshed: tokenRefreshed,
    };

    const existingMetadata =
      tokenRecord.metadata && typeof tokenRecord.metadata === "object"
        ? tokenRecord.metadata as Record<string, unknown>
        : {};

    const providerAccountId = String(
      xUser.id || tokenRecord.provider_account_id || "",
    );
    const providerAccountHandle = String(
      xUser.username || tokenRecord.provider_account_handle || "",
    );

    const connectorState = {
      user_id: userData.user.id,
      profile_id: tokenRecord.profile_id,
      model_id: tokenRecord.model_id,
      connector_service: "x",
      connector_label: "X",
      connector_category: "social",
      runtime: "oauth-required",
      connection_state: "connected",
      source_vault_ready: true,
      metadata: {
        ...existingMetadata,
        provider: "x",
        provider_account_id: providerAccountId,
        provider_account_handle: providerAccountHandle,
        profile_name: xUser.name || "",
        profile_created_at: xUser.created_at || "",
        profile_verified: xUser.verified === true,
        profile_verified_type: xUser.verified_type || "",
        ...inventory,
      },
    };

    const { error: stateError } = await serviceClient
      .from("privacy_connector_state")
      .upsert(connectorState, { onConflict: "user_id,connector_service" });

    if (stateError) throw stateError;

    return jsonResponse({
      ok: true,
      connectorService: "x",
      providerAccountId,
      providerAccountHandle,
      inventory,
      posts: normalizedPosts,
      items: normalizedPosts,
    });
  } catch (error) {
    console.error("[connectors-x-inventory] Failed.", error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "X_INVENTORY_FAILED",
    }, 500);
  }
});
