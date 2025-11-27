import { getAccessToken } from "./auth";
import type {
  CollectionsResponse,
  CollectionResponse,
  RaindropsResponse,
  RaindropResponse,
  TagsResponse,
  HighlightsResponse,
  FiltersResponse,
  UserResponse,
  SuggestionsResponse,
  CreateRaindropRequest,
  UpdateRaindropRequest,
  BulkUpdateRaindropsRequest,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  RaindropsParams,
} from "./types";

const BASE_URL = "https://api.raindrop.io/rest/v1";

interface ApiError {
  error: string | number;
  errorMessage?: string;
  result: boolean;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiError;
    throw new Error(
      error.errorMessage || `API error: ${response.status} - ${error.error}`
    );
  }

  return data as T;
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

// ============ Collections ============

export async function getCollections(): Promise<CollectionsResponse> {
  return apiRequest<CollectionsResponse>("/collections");
}

export async function getChildCollections(): Promise<CollectionsResponse> {
  return apiRequest<CollectionsResponse>("/collections/childrens");
}

export async function getCollection(id: number): Promise<CollectionResponse> {
  return apiRequest<CollectionResponse>(`/collection/${id}`);
}

export async function createCollection(
  data: CreateCollectionRequest
): Promise<CollectionResponse> {
  return apiRequest<CollectionResponse>("/collection", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCollection(
  id: number,
  data: UpdateCollectionRequest
): Promise<CollectionResponse> {
  return apiRequest<CollectionResponse>(`/collection/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCollection(
  id: number
): Promise<{ result: boolean }> {
  return apiRequest<{ result: boolean }>(`/collection/${id}`, {
    method: "DELETE",
  });
}

export async function emptyTrash(): Promise<{ result: boolean }> {
  return apiRequest<{ result: boolean }>("/collection/-99", {
    method: "DELETE",
  });
}

// ============ Raindrops ============

export async function getRaindrops(
  collectionId: number,
  params: RaindropsParams = {}
): Promise<RaindropsResponse> {
  const query = buildQueryString(params as Record<string, unknown>);
  return apiRequest<RaindropsResponse>(`/raindrops/${collectionId}${query}`);
}

export async function getRaindrop(id: number): Promise<RaindropResponse> {
  return apiRequest<RaindropResponse>(`/raindrop/${id}`);
}

export async function createRaindrop(
  data: CreateRaindropRequest
): Promise<RaindropResponse> {
  return apiRequest<RaindropResponse>("/raindrop", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRaindrop(
  id: number,
  data: UpdateRaindropRequest
): Promise<RaindropResponse> {
  return apiRequest<RaindropResponse>(`/raindrop/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRaindrop(id: number): Promise<{ result: boolean }> {
  return apiRequest<{ result: boolean }>(`/raindrop/${id}`, {
    method: "DELETE",
  });
}

export async function createRaindrops(
  items: CreateRaindropRequest[]
): Promise<{ result: boolean; items: unknown[] }> {
  return apiRequest<{ result: boolean; items: unknown[] }>("/raindrops", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function bulkUpdateRaindrops(
  collectionId: number,
  data: BulkUpdateRaindropsRequest,
  search?: string
): Promise<{ result: boolean; modified?: number }> {
  const query = search ? buildQueryString({ search }) : "";
  return apiRequest<{ result: boolean; modified?: number }>(
    `/raindrops/${collectionId}${query}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function bulkDeleteRaindrops(
  collectionId: number,
  ids: number[],
  search?: string
): Promise<{ result: boolean; modified: number }> {
  const query = search ? buildQueryString({ search }) : "";
  return apiRequest<{ result: boolean; modified: number }>(
    `/raindrops/${collectionId}${query}`,
    {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }
  );
}

// ============ Tags ============

export async function getTags(
  collectionId?: number
): Promise<TagsResponse> {
  const id = collectionId ?? 0;
  return apiRequest<TagsResponse>(`/tags/${id}`);
}

export async function renameTags(
  collectionId: number,
  oldTag: string,
  newTag: string
): Promise<{ result: boolean }> {
  return apiRequest<{ result: boolean }>(`/tags/${collectionId}`, {
    method: "PUT",
    body: JSON.stringify({
      tags: [newTag],
      replace: oldTag,
    }),
  });
}

export async function deleteTags(
  collectionId: number,
  tags: string[]
): Promise<{ result: boolean }> {
  return apiRequest<{ result: boolean }>(`/tags/${collectionId}`, {
    method: "DELETE",
    body: JSON.stringify({ tags }),
  });
}

// ============ Highlights ============

export async function getHighlights(
  params: { page?: number; perpage?: number } = {}
): Promise<HighlightsResponse> {
  const query = buildQueryString(params);
  return apiRequest<HighlightsResponse>(`/highlights${query}`);
}

export async function getHighlightsByCollection(
  collectionId: number,
  params: { page?: number; perpage?: number } = {}
): Promise<HighlightsResponse> {
  const query = buildQueryString(params);
  return apiRequest<HighlightsResponse>(`/highlights/${collectionId}${query}`);
}

// ============ Filters ============

export async function getFilters(collectionId: number): Promise<FiltersResponse> {
  return apiRequest<FiltersResponse>(`/filters/${collectionId}`);
}

// ============ User ============

export async function getUser(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/user");
}

// ============ Suggestions ============

export async function suggestForUrl(link: string): Promise<SuggestionsResponse> {
  return apiRequest<SuggestionsResponse>("/raindrop/suggest", {
    method: "POST",
    body: JSON.stringify({ link }),
  });
}

export async function suggestForRaindrop(
  id: number
): Promise<SuggestionsResponse> {
  return apiRequest<SuggestionsResponse>(`/raindrop/${id}/suggest`);
}
