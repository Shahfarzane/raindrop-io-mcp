// Types for local X.com (Twitter) JSON export files
// These are different from the API types - they come from browser extensions/export tools

export interface XLocalMedia {
	type: "photo" | "video" | "animated_gif";
	url: string;
	thumbnail?: string;
	original?: string;
}

export interface XLocalTweet {
	id: string;
	url: string;
	full_text: string;
	created_at: string;
	screen_name: string;
	name: string;
	profile_image_url?: string;
	media?: XLocalMedia[];
	favorite_count?: number;
	retweet_count?: number;
	bookmark_count?: number;
	quote_count?: number;
	reply_count?: number;
	views_count?: number;
	favorited?: boolean;
	retweeted?: boolean;
	bookmarked?: boolean;
	in_reply_to?: string | null;
	retweeted_status?: unknown;
	quoted_status?: unknown;
	metadata?: unknown;
}

export interface XLocalImportResult {
	total: number;
	imported: number;
	skipped: number;
	failed: number;
	errors: Array<{ tweetId: string; error: string }>;
}
