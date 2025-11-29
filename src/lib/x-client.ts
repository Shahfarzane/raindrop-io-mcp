import { getXAccessToken } from "./x-auth";
import type {
	XBookmarksResponse,
	XRateLimitInfo,
	XUserResponse,
} from "./x-types";

const X_API_BASE = "https://api.twitter.com/2";

// Rate limiting constants
const MIN_REQUEST_INTERVAL_MS = 350; // 350ms between requests
const RATE_LIMIT_DANGER_ZONE = 5; // Pause if fewer than 5 requests remaining
const RATE_LIMIT_WARNING_ZONE = 20; // Log warning if fewer than 20 remaining

// ============ Rate Limiter ============

class RateLimiter {
	private remaining = 180; // Default X API limit for bookmarks
	private reset = 0; // Unix timestamp when limit resets
	private lastRequestTime = 0;

	/**
	 * Check rate limits and wait if necessary before making a request
	 */
	async checkAndWait(): Promise<void> {
		const now = Date.now();

		// Enforce minimum interval between requests
		const elapsed = now - this.lastRequestTime;
		if (elapsed < MIN_REQUEST_INTERVAL_MS && this.lastRequestTime > 0) {
			await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
		}

		const nowSeconds = Math.floor(Date.now() / 1000);

		// If past reset time, limits have refreshed
		if (nowSeconds > this.reset) {
			this.remaining = 180;
			return;
		}

		// Warning zone: log but continue
		if (
			this.remaining <= RATE_LIMIT_WARNING_ZONE &&
			this.remaining > RATE_LIMIT_DANGER_ZONE
		) {
			console.warn(
				`[X Rate Limit] Warning: ${this.remaining} requests remaining`
			);
		}

		// Danger zone: pause until reset
		if (this.remaining <= RATE_LIMIT_DANGER_ZONE) {
			const waitMs = (this.reset - nowSeconds) * 1000 + 5000; // +5s buffer
			console.log(
				`[X Rate Limit] Approaching limit. Pausing ${Math.round(waitMs / 1000)}s until reset...`
			);
			await sleep(waitMs);
			this.remaining = 180;
		}
	}

	/**
	 * Update rate limit info from response headers
	 */
	updateFromHeaders(headers: Headers): void {
		const remaining = headers.get("x-rate-limit-remaining");
		const reset = headers.get("x-rate-limit-reset");

		if (remaining) {
			this.remaining = parseInt(remaining, 10);
		}
		if (reset) {
			this.reset = parseInt(reset, 10);
		}
	}

	/**
	 * Record that a request was made
	 */
	recordRequest(): void {
		this.lastRequestTime = Date.now();
		if (this.remaining > 0) {
			this.remaining--;
		}
	}

	/**
	 * Get current rate limit info
	 */
	getInfo(): XRateLimitInfo {
		return {
			limit: 180,
			remaining: this.remaining,
			reset: this.reset,
		};
	}
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// ============ Helpers ============

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

interface XApiError {
	detail?: string;
	title?: string;
	type?: string;
	errors?: Array<{ message: string }>;
}

/**
 * Make an API request with rate limiting and retry logic
 */
async function xApiRequest<T>(
	path: string,
	options: RequestInit = {},
	maxRetries = 3
): Promise<{ data: T; headers: Headers }> {
	const token = await getXAccessToken();

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		// Check rate limits before request
		await rateLimiter.checkAndWait();

		const response = await fetch(`${X_API_BASE}${path}`, {
			...options,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		// Record the request
		rateLimiter.recordRequest();

		// Update rate limit info from headers
		rateLimiter.updateFromHeaders(response.headers);

		// Handle rate limit errors with retry
		if (response.status === 429) {
			const resetTime = parseInt(
				response.headers.get("x-rate-limit-reset") || "0",
				10
			);
			const nowSeconds = Math.floor(Date.now() / 1000);
			const waitMs = (resetTime - nowSeconds) * 1000 + 5000; // +5s buffer

			console.log(
				`[X Rate Limit] 429 received. Waiting ${Math.round(waitMs / 1000)}s until reset...`
			);

			if (attempt < maxRetries - 1) {
				await sleep(waitMs);
				continue;
			}
		}

		if (!response.ok) {
			let errorMessage = `X API error: ${response.status} ${response.statusText}`;
			try {
				const errorData = (await response.json()) as XApiError;
				if (errorData.detail) {
					errorMessage = errorData.detail;
				} else if (errorData.errors?.[0]?.message) {
					errorMessage = errorData.errors[0].message;
				}
			} catch {
				// Ignore JSON parse errors
			}
			throw new Error(errorMessage);
		}

		const data = (await response.json()) as T;
		return { data, headers: response.headers };
	}

	throw new Error("Max retries exceeded for X API request");
}

// ============ Public API Functions ============

/**
 * Get the currently authenticated user's info
 */
export async function getCurrentXUser(): Promise<{
	id: string;
	username: string;
	name: string;
}> {
	const { data } = await xApiRequest<XUserResponse>("/users/me");
	return data.data;
}

/**
 * Fetch a page of bookmarks for a user
 */
export async function fetchBookmarks(params: {
	userId: string;
	maxResults?: number;
	paginationToken?: string;
}): Promise<XBookmarksResponse> {
	const queryParams = new URLSearchParams({
		max_results: String(params.maxResults || 100),
		"tweet.fields":
			"attachments,author_id,created_at,public_metrics,entities,text,conversation_id,lang",
		expansions: "author_id,attachments.media_keys",
		"user.fields": "username,name,profile_image_url,description,verified",
		"media.fields": "url,type,preview_image_url,alt_text,width,height",
	});

	if (params.paginationToken) {
		queryParams.set("pagination_token", params.paginationToken);
	}

	const { data } = await xApiRequest<XBookmarksResponse>(
		`/users/${params.userId}/bookmarks?${queryParams.toString()}`
	);

	return data;
}

/**
 * Get current rate limit status
 */
export function getXRateLimitInfo(): XRateLimitInfo {
	return rateLimiter.getInfo();
}

/**
 * Reset the rate limiter (useful for testing)
 */
export function resetXRateLimiter(): void {
	// Create new instance by reassigning
	Object.assign(rateLimiter, new RateLimiter());
}
