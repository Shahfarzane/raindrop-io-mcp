import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { OAuthTokens, OAuthTokenResponse } from "./types";

const TOKEN_FILE = path.join(os.homedir(), ".raindrop-mcp", "tokens.json");
const OAUTH_AUTHORIZE_URL = "https://raindrop.io/oauth/authorize";
const OAUTH_TOKEN_URL = "https://raindrop.io/oauth/access_token";

// Buffer time before token expiry (5 minutes)
const EXPIRY_BUFFER_SECONDS = 300;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getClientId(): string {
  return getEnvVar("RAINDROP_CLIENT_ID");
}

function getClientSecret(): string {
  return getEnvVar("RAINDROP_CLIENT_SECRET");
}

function getRedirectUri(): string {
  return getEnvVar("RAINDROP_REDIRECT_URI");
}

function ensureTokenDir(): void {
  const tokenDir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(tokenDir)) {
    fs.mkdirSync(tokenDir, { recursive: true });
  }
}

function loadTokens(): OAuthTokens | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }
    const content = fs.readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(content) as OAuthTokens;
  } catch {
    return null;
  }
}

function saveTokens(tokens: OAuthTokens): void {
  ensureTokenDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

function isTokenExpired(tokens: OAuthTokens): boolean {
  const now = Math.floor(Date.now() / 1000);
  return tokens.expires_at <= now + EXPIRY_BUFFER_SECONDS;
}

export function getAuthUrl(): string {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<OAuthTokens> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = (await response.json()) as OAuthTokenResponse;

  const tokens: OAuthTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    token_type: data.token_type,
  };

  saveTokens(tokens);
  return tokens;
}

async function refreshTokens(refreshToken: string): Promise<OAuthTokens> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = (await response.json()) as OAuthTokenResponse;

  const tokens: OAuthTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    token_type: data.token_type,
  };

  saveTokens(tokens);
  return tokens;
}

export async function getAccessToken(): Promise<string> {
  let tokens = loadTokens();

  if (!tokens) {
    throw new Error(
      "Not authenticated. Please use get_auth_url to get the authorization URL, " +
      "then use exchange_auth_code with the code from the callback."
    );
  }

  if (isTokenExpired(tokens)) {
    tokens = await refreshTokens(tokens.refresh_token);
  }

  return tokens.access_token;
}

export function isAuthenticated(): boolean {
  const tokens = loadTokens();
  return tokens !== null;
}

export function clearTokens(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}
