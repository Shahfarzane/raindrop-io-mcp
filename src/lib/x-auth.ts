import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";

import type { XOAuthTokenResponse, XOAuthTokens } from "./x-types";

const TOKEN_FILE = path.join(os.homedir(), ".raindrop-mcp", "x-tokens.json");
const PKCE_FILE = path.join(os.homedir(), ".raindrop-mcp", "x-pkce.json");

const OAUTH_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const OAUTH_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

// Required scopes for bookmarks access
const SCOPES = ["tweet.read", "users.read", "bookmark.read", "offline.access"];

// Buffer time before token expiry (5 minutes)
const EXPIRY_BUFFER_SECONDS = 300;

function getEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function getXClientId(): string {
	return getEnvVar("X_CLIENT_ID");
}

function getXClientSecret(): string {
	// Client secret is optional for public clients with PKCE
	return process.env.X_CLIENT_SECRET || "";
}

function getXRedirectUri(): string {
	return getEnvVar("X_REDIRECT_URI");
}

function ensureTokenDir(): void {
	const tokenDir = path.dirname(TOKEN_FILE);
	if (!fs.existsSync(tokenDir)) {
		fs.mkdirSync(tokenDir, { recursive: true });
	}
}

// ============ PKCE Helpers ============

interface PKCEParams {
	verifier: string;
	challenge: string;
	state: string;
}

function generatePKCE(): PKCEParams {
	// Generate random code_verifier (43-128 chars, base64url)
	const verifier = crypto.randomBytes(32).toString("base64url");

	// Generate code_challenge (SHA256 hash of verifier, base64url encoded)
	const challenge = crypto
		.createHash("sha256")
		.update(verifier)
		.digest("base64url");

	// Generate state for CSRF protection
	const state = crypto.randomBytes(16).toString("hex");

	return { verifier, challenge, state };
}

function savePKCE(pkce: PKCEParams): void {
	ensureTokenDir();
	fs.writeFileSync(PKCE_FILE, JSON.stringify(pkce, null, 2), "utf-8");
}

function loadPKCE(): PKCEParams | null {
	try {
		if (!fs.existsSync(PKCE_FILE)) {
			return null;
		}
		const content = fs.readFileSync(PKCE_FILE, "utf-8");
		return JSON.parse(content) as PKCEParams;
	} catch {
		return null;
	}
}

function clearPKCE(): void {
	if (fs.existsSync(PKCE_FILE)) {
		fs.unlinkSync(PKCE_FILE);
	}
}

// ============ Token Management ============

function loadXTokens(): XOAuthTokens | null {
	try {
		if (!fs.existsSync(TOKEN_FILE)) {
			return null;
		}
		const content = fs.readFileSync(TOKEN_FILE, "utf-8");
		return JSON.parse(content) as XOAuthTokens;
	} catch {
		return null;
	}
}

function saveXTokens(tokens: XOAuthTokens): void {
	ensureTokenDir();
	fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

function isXTokenExpired(tokens: XOAuthTokens): boolean {
	const now = Math.floor(Date.now() / 1000);
	return tokens.expires_at <= now + EXPIRY_BUFFER_SECONDS;
}

// ============ Public Functions ============

/**
 * Generate the X.com OAuth authorization URL with PKCE
 * Returns the URL and saves PKCE params for later verification
 */
export function getXAuthUrl(): string {
	const clientId = getXClientId();
	const redirectUri = getXRedirectUri();

	// Generate and save PKCE params
	const pkce = generatePKCE();
	savePKCE(pkce);

	const params = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: SCOPES.join(" "),
		state: pkce.state,
		code_challenge: pkce.challenge,
		code_challenge_method: "S256",
	});

	return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens using PKCE
 */
export async function exchangeXCode(
	code: string,
	state?: string
): Promise<XOAuthTokens> {
	const clientId = getXClientId();
	const clientSecret = getXClientSecret();
	const redirectUri = getXRedirectUri();

	// Load and verify PKCE params
	const pkce = loadPKCE();
	if (!pkce) {
		throw new Error(
			"PKCE parameters not found. Please start the auth flow again."
		);
	}

	// Verify state if provided (CSRF protection)
	if (state && state !== pkce.state) {
		clearPKCE();
		throw new Error("Invalid state parameter. Possible CSRF attack.");
	}

	// Build request body
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		code_verifier: pkce.verifier,
	});

	// Build authorization header
	// X API requires Basic auth with client_id:client_secret (even if secret is empty)
	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
		"base64"
	);

	const response = await fetch(OAUTH_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${credentials}`,
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.text();
		clearPKCE();
		throw new Error(`Failed to exchange code: ${error}`);
	}

	const data = (await response.json()) as XOAuthTokenResponse;

	const tokens: XOAuthTokens = {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
		token_type: data.token_type,
	};

	saveXTokens(tokens);
	clearPKCE(); // Clean up PKCE params after successful exchange

	return tokens;
}

/**
 * Refresh X.com access token using refresh token
 */
async function refreshXTokens(refreshToken: string): Promise<XOAuthTokens> {
	const clientId = getXClientId();
	const clientSecret = getXClientSecret();

	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: refreshToken,
	});

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
		"base64"
	);

	const response = await fetch(OAUTH_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${credentials}`,
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to refresh X token: ${error}`);
	}

	const data = (await response.json()) as XOAuthTokenResponse;

	const tokens: XOAuthTokens = {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
		token_type: data.token_type,
	};

	saveXTokens(tokens);
	return tokens;
}

/**
 * Get a valid X.com access token, refreshing if necessary
 */
export async function getXAccessToken(): Promise<string> {
	let tokens = loadXTokens();

	if (!tokens) {
		throw new Error(
			"Not authenticated with X.com. Please use x_authenticate tool first."
		);
	}

	if (isXTokenExpired(tokens)) {
		tokens = await refreshXTokens(tokens.refresh_token);
	}

	return tokens.access_token;
}

/**
 * Check if user is authenticated with X.com
 */
export function isXAuthenticated(): boolean {
	const tokens = loadXTokens();
	return tokens !== null;
}

/**
 * Clear X.com tokens (logout)
 */
export function clearXTokens(): void {
	if (fs.existsSync(TOKEN_FILE)) {
		fs.unlinkSync(TOKEN_FILE);
	}
	clearPKCE();
}

/**
 * Start the full X.com OAuth flow with a local callback server
 * Opens browser for authorization and waits for callback
 */
export async function startXAuthFlow(timeoutMs = 120_000): Promise<string> {
	const redirectUri = getXRedirectUri();
	const url = new URL(redirectUri);
	const port = Number.parseInt(url.port, 10) || 3001;
	const callbackPath = url.pathname || "/callback";

	// Generate auth URL (saves PKCE params)
	const authUrl = getXAuthUrl();

	// Log the URL for the user
	console.log("\n========================================");
	console.log("X.com Authentication Required");
	console.log("========================================");
	console.log("\nPlease open this URL in your browser:");
	console.log(`\n${authUrl}\n`);
	console.log("Waiting for authorization...\n");

	return new Promise((resolve, reject) => {
		const server = http.createServer(async (req, res) => {
			const reqUrl = new URL(req.url || "", `http://localhost:${port}`);

			if (reqUrl.pathname === callbackPath) {
				const code = reqUrl.searchParams.get("code");
				const state = reqUrl.searchParams.get("state");
				const error = reqUrl.searchParams.get("error");
				const errorDescription = reqUrl.searchParams.get("error_description");

				if (error) {
					res.writeHead(400, { "Content-Type": "text/html" });
					res.end(
						`<html><body><h1>X.com Authentication Failed</h1><p>${error}: ${errorDescription || "Unknown error"}</p><p>You can close this window.</p></body></html>`
					);
					server.close();
					reject(new Error(`OAuth error: ${error} - ${errorDescription}`));
					return;
				}

				if (code) {
					try {
						await exchangeXCode(code, state || undefined);
						res.writeHead(200, { "Content-Type": "text/html" });
						res.end(
							"<html><body><h1>X.com Authentication Successful!</h1><p>You can close this window and return to Claude Code.</p></body></html>"
						);
						server.close();
						resolve(
							"X.com authentication successful! You can now import bookmarks."
						);
					} catch (err) {
						res.writeHead(500, { "Content-Type": "text/html" });
						res.end(
							`<html><body><h1>Authentication Failed</h1><p>${err instanceof Error ? err.message : "Unknown error"}</p></body></html>`
						);
						server.close();
						reject(err);
					}
					return;
				}

				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(
					"<html><body><h1>Missing Code</h1><p>No authorization code received.</p></body></html>"
				);
				return;
			}

			// For any other path, return 404
			res.writeHead(404);
			res.end();
		});

		// Set timeout
		const timeout = setTimeout(() => {
			server.close();
			reject(
				new Error(
					`X.com authentication timed out after ${timeoutMs / 1000} seconds. Please try again.`
				)
			);
		}, timeoutMs);

		server.on("close", () => {
			clearTimeout(timeout);
		});

		server.on("error", (err: NodeJS.ErrnoException) => {
			clearTimeout(timeout);
			if (err.code === "EADDRINUSE") {
				reject(
					new Error(
						`Port ${port} is already in use. Please close any other servers on that port and try again.`
					)
				);
			} else {
				reject(err);
			}
		});

		server.listen(port, () => {
			// Server is ready - waiting for callback
		});
	});
}

/**
 * Get the callback port from the redirect URI
 */
export function getXCallbackPort(): number {
	const redirectUri = getXRedirectUri();
	const url = new URL(redirectUri);
	return Number.parseInt(url.port, 10) || 3001;
}
