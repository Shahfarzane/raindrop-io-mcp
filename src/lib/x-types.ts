// X.com (Twitter) API Types

// ============ OAuth Types ============

export interface XOAuthTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number; // Unix timestamp in seconds
	token_type: string;
}

export interface XOAuthTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number; // seconds
	token_type: string;
	scope: string;
}

// ============ Tweet Types ============

export interface XTweetPublicMetrics {
	retweet_count: number;
	reply_count: number;
	like_count: number;
	quote_count: number;
	bookmark_count?: number;
	impression_count?: number;
}

export interface XTweetEntity {
	start: number;
	end: number;
}

export interface XTweetUrl extends XTweetEntity {
	url: string;
	expanded_url: string;
	display_url: string;
	title?: string;
	description?: string;
}

export interface XTweetHashtag extends XTweetEntity {
	tag: string;
}

export interface XTweetMention extends XTweetEntity {
	username: string;
	id: string;
}

export interface XTweetEntities {
	urls?: XTweetUrl[];
	hashtags?: XTweetHashtag[];
	mentions?: XTweetMention[];
}

export interface XTweetAttachments {
	media_keys?: string[];
	poll_ids?: string[];
}

export interface XTweet {
	id: string;
	text: string;
	author_id: string;
	created_at: string;
	public_metrics?: XTweetPublicMetrics;
	entities?: XTweetEntities;
	attachments?: XTweetAttachments;
	conversation_id?: string;
	in_reply_to_user_id?: string;
	lang?: string;
}

// ============ User Types ============

export interface XUser {
	id: string;
	username: string;
	name: string;
	profile_image_url?: string;
	description?: string;
	verified?: boolean;
	created_at?: string;
	public_metrics?: {
		followers_count: number;
		following_count: number;
		tweet_count: number;
	};
}

// ============ Media Types ============

export type XMediaType = "photo" | "video" | "animated_gif";

export interface XMedia {
	media_key: string;
	type: XMediaType;
	url?: string; // For photos
	preview_image_url?: string; // For videos/gifs
	alt_text?: string;
	width?: number;
	height?: number;
	duration_ms?: number; // For videos
}

// ============ API Response Types ============

export interface XBookmarksResponse {
	data?: XTweet[];
	includes?: {
		users?: XUser[];
		media?: XMedia[];
	};
	meta: {
		result_count: number;
		next_token?: string;
		previous_token?: string;
	};
	errors?: Array<{
		detail: string;
		title: string;
		type: string;
	}>;
}

export interface XUserResponse {
	data: {
		id: string;
		name: string;
		username: string;
	};
}

// ============ Import State Types ============

export type XImportStatus = "running" | "paused" | "completed" | "failed";

export interface XImportError {
	tweetId: string;
	error: string;
	timestamp: number;
}

export interface XImportState {
	importId: string;
	status: XImportStatus;
	startedAt: number;
	lastUpdateAt: number;
	collectionId: number;
	collectionName: string;
	totalFetched: number;
	totalSaved: number;
	totalSkipped: number;
	totalFailed: number;
	nextPaginationToken?: string;
	processedTweetIds: string[];
	errors: XImportError[];
}

// ============ Rate Limit Types ============

export interface XRateLimitInfo {
	limit: number;
	remaining: number;
	reset: number; // Unix timestamp
}
