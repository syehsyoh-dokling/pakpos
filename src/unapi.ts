import {
  forgotPasswordCentral,
  generateSocialcastMedia,
  getAppAccess,
  getProfileCentral,
  importSocialcastMedia,
  loginCentral,
  registerCentral,
  requestAppAccess,
  requestJson,
  type AuthSession,
  type AuthUser,
  type SocialcastMediaAsset,
} from "@platform/api-client";

export const APP_CODE = "pakpos";
export const UNAPI_BASE_URL =
  import.meta.env.VITE_CENTRAL_API_URL || "https://unapi.danandad.org";

export type UnapiSession = AuthSession;
export type UnapiUser = AuthUser;
export type UnapiMediaAsset = SocialcastMediaAsset;

export function loginToUnapi(email: string, password: string) {
  return loginCentral(UNAPI_BASE_URL, { email, password });
}

export function getGoogleAuthConfig() {
  return requestJson<{
    client_id: string;
    auth_uri: string;
    javascript_origins?: string[];
  }>(UNAPI_BASE_URL, "/api/auth/google/config", { method: "GET" });
}

export function loginWithGoogleToken(accessToken: string) {
  return requestJson<UnapiSession>(UNAPI_BASE_URL, "/api/auth/google/token", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
  });
}

export function registerToUnapi(payload: {
  email: string;
  password: string;
  full_name: string;
  name?: string;
}) {
  return registerCentral(UNAPI_BASE_URL, payload);
}

export function forgotPasswordUnapi(email: string) {
  return forgotPasswordCentral(UNAPI_BASE_URL, email);
}

export function getMeFromUnapi(accessToken: string) {
  return getProfileCentral(UNAPI_BASE_URL, accessToken);
}

export async function ensurePakposAccess(accessToken: string) {
  const current = await getAppAccess(UNAPI_BASE_URL, accessToken, APP_CODE).catch(() => null);
  if (current?.membership) return current;

  await requestAppAccess(UNAPI_BASE_URL, accessToken, {
    app_code: APP_CODE,
    requested_role: "writer",
    notes: "Requested from Auto POST workspace.",
  }).catch(() => null);

  return getAppAccess(UNAPI_BASE_URL, accessToken, APP_CODE).catch(() => current);
}

export function logoutFromUnapi(accessToken: string) {
  return requestJson(UNAPI_BASE_URL, "/api/auth/logout", { method: "POST" }, accessToken);
}

export function importArticleChunks(
  accessToken: string,
  payload: Record<string, unknown> | FormData
) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    "/api/articles/import/chunks",
    {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    },
    accessToken
  );
}

export function extractSourcePreviewOnUnapi(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  return requestJson<{
    file_name: string;
    mime_type: string;
    size: number;
    source_type: string;
    text: string;
    pages: number;
    error?: string | null;
  }>(
    UNAPI_BASE_URL,
    "/api/articles/source-preview",
    {
      method: "POST",
      body: formData,
    }
  );
}

export function saveArticleDraft(accessToken: string, payload: Record<string, unknown>) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    "/api/articles/draft",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken
  );
}

export function submitArticle(accessToken: string, articleId: string | number) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    `/api/articles/${encodeURIComponent(String(articleId))}/submit`,
    { method: "PUT" },
    accessToken
  );
}

export function reviewArticle(
  accessToken: string,
  articleId: string | number,
  payload: Record<string, unknown>
) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    `/api/articles/${encodeURIComponent(String(articleId))}/review`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken
  );
}

export function publishArticle(
  accessToken: string,
  articleId: string | number,
  payload: Record<string, unknown> = {}
) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    `/api/articles/${encodeURIComponent(String(articleId))}/publish`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken
  );
}

export function getArticles(accessToken: string) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    `/api/articles?app_code=${encodeURIComponent(APP_CODE)}`,
    { method: "GET" },
    accessToken
  );
}

export function scheduleSocialcast(accessToken: string, payload: Record<string, unknown>) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    "/api/socialcast/schedule",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken
  );
}

export function getSocialcastQueue(accessToken: string) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    `/api/socialcast/queue?app_code=${encodeURIComponent(APP_CODE)}`,
    { method: "GET" },
    accessToken
  );
}

export function getSocialcastHistory(accessToken: string) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    `/api/socialcast/history?app_code=${encodeURIComponent(APP_CODE)}`,
    { method: "GET" },
    accessToken
  );
}

export function generateMediaOnUnapi(
  accessToken: string,
  payload: Parameters<typeof generateSocialcastMedia>[2]
) {
  return generateSocialcastMedia(UNAPI_BASE_URL, accessToken, payload);
}

export function importMediaOnUnapi(
  accessToken: string,
  payload: Parameters<typeof importSocialcastMedia>[2]
) {
  return importSocialcastMedia(UNAPI_BASE_URL, accessToken, payload);
}

export function importMediaLinkOnUnapi(
  accessToken: string,
  payload: {
    app_code: string;
    postId: string;
    postCode?: string;
    mediaType: "image" | "video";
    url: string;
    name?: string;
    caption?: string;
    visualPrompt?: string;
    platforms?: string[];
    version?: number;
    storedName?: string;
  }
) {
  return requestJson<{ asset: SocialcastMediaAsset }>(
    UNAPI_BASE_URL,
    "/api/socialcast/import-media-link",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken
  );
}

export function saveSocialcastCredentials(
  accessToken: string,
  payload: {
    platform: string;
    credentials: Record<string, string>;
  }
) {
  return requestJson<unknown>(
    UNAPI_BASE_URL,
    "/api/socialcast/credentials",
    {
      method: "POST",
      body: JSON.stringify({
        app_code: APP_CODE,
        ...payload,
      }),
    },
    accessToken
  );
}
