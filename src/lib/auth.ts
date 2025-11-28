import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as http from "http";
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

/**
 * Starts a temporary HTTP server to capture the OAuth callback,
 * then automatically exchanges the code for tokens.
 * Returns the auth URL for the user to open.
 */
export async function startAuthFlow(timeoutMs: number = 120000): Promise<string> {
  const redirectUri = getRedirectUri();
  const url = new URL(redirectUri);
  const port = parseInt(url.port) || 3000;
  const callbackPath = url.pathname || "/callback";

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url || "", `http://localhost:${port}`);

      if (reqUrl.pathname === callbackPath) {
        const code = reqUrl.searchParams.get("code");
        const error = reqUrl.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>Authentication Failed</h1><p>${error}</p><p>You can close this window.</p></body></html>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          try {
            await exchangeCode(code);
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`<html><body><h1>Authentication Successful!</h1><p>You can close this window and return to Claude Code.</p></body></html>`);
            server.close();
            resolve("Authentication successful! You can now use Raindrop.io tools.");
          } catch (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(`<html><body><h1>Authentication Failed</h1><p>${err instanceof Error ? err.message : "Unknown error"}</p></body></html>`);
            server.close();
            reject(err);
          }
          return;
        }

        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<html><body><h1>Missing Code</h1><p>No authorization code received.</p></body></html>`);
        return;
      }

      // For any other path, return 404
      res.writeHead(404);
      res.end();
    });

    // Set timeout
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error(`Authentication timed out after ${timeoutMs / 1000} seconds. Please try again.`));
    }, timeoutMs);

    server.on("close", () => {
      clearTimeout(timeout);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use. Please close any other servers on that port and try again.`));
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      // Server is ready - this doesn't resolve the promise yet
      // The promise resolves when we get the callback
    });
  });
}

/**
 * Get the port from the redirect URI
 */
export function getCallbackPort(): number {
  const redirectUri = getRedirectUri();
  const url = new URL(redirectUri);
  return parseInt(url.port) || 3000;
}
