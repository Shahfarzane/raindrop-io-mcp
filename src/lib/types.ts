// Raindrop.io API Types

// ============ Field Selection ============

export type FieldLevel = "minimal" | "summary" | "standard" | "full";

// ============ Authentication ============

export interface OAuthTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number; // Unix timestamp in seconds
	token_type: string;
}

export interface OAuthTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number; // seconds
	token_type: string;
}

// ============ Collections ============

export interface CollectionAccess {
	level: number;
	draggable: boolean;
}

export interface CollectionFull {
	_id: number;
	title: string;
	count: number;
	color?: string;
	cover?: string[];
	created?: string;
	lastUpdate?: string;
	expanded?: boolean;
	public?: boolean;
	sort?: number;
	view?: "list" | "simple" | "grid" | "masonry";
	access?: CollectionAccess;
	parent?: { $id: number };
	user?: { $id: number };
}

export interface CollectionMinimal {
	id: number;
	title: string;
}

export interface CollectionSummary extends CollectionMinimal {
	count: number;
	parentId?: number;
	childCount?: number; // count of children
}

export interface CollectionTree {
	id: number;
	title: string;
	count: number;
	parentId?: number;
	color?: string;
	view?: string;
	public?: boolean;
	children: CollectionTree[];
}

export interface CollectionsResponse {
	result: boolean;
	items: CollectionFull[];
}

export interface CollectionResponse {
	result: boolean;
	item: CollectionFull;
}

// ============ Raindrops ============

export type RaindropType =
	| "link"
	| "article"
	| "image"
	| "video"
	| "document"
	| "audio";

export interface RaindropMedia {
	link: string;
	type?: string;
}

export interface RaindropFile {
	name: string;
	size: number;
}

export interface RaindropHighlight {
	_id: string;
	text: string;
	color?:
		| "blue"
		| "brown"
		| "cyan"
		| "gray"
		| "green"
		| "indigo"
		| "orange"
		| "pink"
		| "purple"
		| "red"
		| "teal"
		| "yellow";
	note?: string;
	created?: string;
	lastUpdate?: string;
}

export interface RaindropReminder {
	date?: string;
}

export interface RaindropFull {
	_id: number;
	title: string;
	link: string;
	excerpt?: string;
	note?: string;
	type?: RaindropType;
	domain?: string;
	cover?: string;
	tags?: string[];
	important?: boolean;
	created?: string;
	lastUpdate?: string;
	media?: RaindropMedia[];
	highlights?: RaindropHighlight[];
	collection?: { $id: number };
	file?: RaindropFile;
	reminder?: RaindropReminder;
	order?: number;
}

export interface RaindropMinimal {
	id: number;
	title: string;
}

export interface RaindropSummary extends RaindropMinimal {
	domain?: string;
	created?: string;
}

export interface RaindropStandard extends RaindropSummary {
	link: string;
	excerpt?: string;
	tags?: string[];
	important?: boolean;
	type?: RaindropType;
	collectionId?: number;
}

export interface RaindropsResponse {
	result: boolean;
	items: RaindropFull[];
	count: number;
}

export interface RaindropResponse {
	result: boolean;
	item: RaindropFull;
}

// ============ Tags ============

export interface Tag {
	_id: string;
	count: number;
}

export interface TagsResponse {
	result: boolean;
	items: Tag[];
}

// ============ Highlights ============

export interface HighlightWithRaindrop extends RaindropHighlight {
	raindropRef: number;
	link: string;
	title: string;
}

export interface HighlightsResponse {
	result: boolean;
	items: HighlightWithRaindrop[];
}

// ============ Filters ============

export interface FilterCount {
	count: number;
}

export interface FilterType {
	_id: string;
	count: number;
}

export interface FiltersResponse {
	result: boolean;
	broken: FilterCount;
	duplicates: FilterCount;
	important: FilterCount;
	notag: FilterCount;
	tags: FilterType[];
	types: FilterType[];
}

// ============ User ============

export interface UserConfig {
	broken_level?: string;
	font_color?: string;
	font_size?: number;
	lang?: string;
	last_collection?: number;
	raindrops_sort?: string;
	raindrops_view?: string;
}

export interface UserFiles {
	used: number;
	size: number;
	lastCheckPoint?: string;
}

export interface UserGroup {
	title: string;
	hidden: boolean;
	sort: number;
	collections: number[];
}

export interface User {
	_id: number;
	email?: string;
	email_MD5?: string;
	fullName?: string;
	password?: boolean;
	pro?: boolean;
	proExpire?: string;
	registered?: string;
	config?: UserConfig;
	files?: UserFiles;
	groups?: UserGroup[];
}

export interface UserResponse {
	result: boolean;
	user: User;
}

// ============ Suggestions ============

export interface SuggestionsResponse {
	result: boolean;
	item: {
		collections: { $id: number }[];
		tags: string[];
	};
}

// ============ API Request Types ============

export interface CreateRaindropRequest {
	link: string;
	title?: string;
	excerpt?: string;
	note?: string;
	type?: RaindropType;
	cover?: string;
	tags?: string[];
	important?: boolean;
	collection?: { $id: number };
	media?: RaindropMedia[];
	highlights?: RaindropHighlight[];
	reminder?: RaindropReminder;
	order?: number;
	pleaseParse?: Record<string, never>; // Empty object to trigger parsing
}

export interface UpdateRaindropRequest {
	title?: string;
	excerpt?: string;
	note?: string;
	link?: string;
	type?: RaindropType;
	cover?: string;
	tags?: string[];
	important?: boolean;
	collection?: { $id: number };
	media?: RaindropMedia[];
	highlights?: RaindropHighlight[];
	reminder?: RaindropReminder;
	order?: number;
	pleaseParse?: Record<string, never>;
}

export interface BulkUpdateRaindropsRequest {
	ids?: number[];
	important?: boolean;
	tags?: string[];
	media?: RaindropMedia[];
	cover?: string;
	collection?: { $id: number };
}

export interface CreateCollectionRequest {
	title: string;
	parent?: { $id: number };
	view?: "list" | "simple" | "grid" | "masonry";
	public?: boolean;
	sort?: number;
	expanded?: boolean;
	color?: string;
}

export interface UpdateCollectionRequest {
	title?: string;
	parent?: { $id: number };
	view?: "list" | "simple" | "grid" | "masonry";
	public?: boolean;
	sort?: number;
	expanded?: boolean;
	color?: string;
	cover?: string[];
}

// ============ Collection Covers ============

export interface CoverIcon {
	png: string;
	svg?: string;
}

export interface CoverCollection {
	title: string;
	icons: CoverIcon[];
}

export interface CoversResponse {
	result: boolean;
	items: CoverCollection[];
}

// ============ API Parameters ============

export interface RaindropsParams {
	search?: string;
	sort?: string;
	page?: number;
	perpage?: number;
	nested?: boolean;
}

// ============ Pagination ============

export interface PaginationMeta {
	total: number;
	page: number;
	perPage: number;
	hasMore: boolean;
	nextPage: number | null;
}

// ============ Shaped Responses ============

export interface ShapedRaindropsResponse<T> {
	items: T[];
	meta: PaginationMeta;
}

export interface ShapedCollectionsResponse<T> {
	collections: T[];
	total: number;
}

// ============ Library Overview ============

export interface LibraryOverview {
	totalRaindrops: number;
	totalCollections: number;
	rootCollections: CollectionMinimal[];
	topTags: { name: string; count: number }[];
	untaggedCount: number;
	systemCollections: {
		unsorted: number;
		trash: number;
	};
}
