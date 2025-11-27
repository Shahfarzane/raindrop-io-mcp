import type {
  FieldLevel,
  RaindropFull,
  RaindropMinimal,
  RaindropSummary,
  RaindropStandard,
  CollectionFull,
  CollectionMinimal,
  CollectionSummary,
} from "./types";

// ============ Field Definitions ============

const RAINDROP_FIELDS: Record<FieldLevel, string[]> = {
  minimal: ["_id", "title"],
  summary: ["_id", "title", "domain", "created"],
  standard: ["_id", "title", "link", "domain", "excerpt", "tags", "created", "important", "type", "collection"],
  full: [
    "_id", "title", "link", "domain", "excerpt", "tags", "created", "important",
    "type", "note", "highlights", "media", "cover", "collection", "lastUpdate",
    "reminder", "file", "order"
  ],
};

const COLLECTION_FIELDS: Record<FieldLevel, string[]> = {
  minimal: ["_id", "title"],
  summary: ["_id", "title", "count", "parent"],
  standard: ["_id", "title", "count", "parent", "color", "view", "public"],
  full: [
    "_id", "title", "count", "parent", "color", "view", "public",
    "cover", "created", "lastUpdate", "expanded", "sort", "access"
  ],
};

// ============ Generic Shaper ============

function shapeObject(
  raw: Record<string, unknown>,
  fields: string[],
  keyMap: Record<string, string> = {}
): Record<string, unknown> {
  const shaped: Record<string, unknown> = {};

  for (const field of fields) {
    const value = raw[field];

    // Skip null, undefined, and empty values
    if (value === undefined || value === null) continue;
    if (value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;

    // Map field name (e.g., _id -> id)
    const outputKey = keyMap[field] || field;
    shaped[outputKey] = value;
  }

  return shaped;
}

// ============ Raindrop Shapers ============

export function shapeRaindropMinimal(raw: RaindropFull): RaindropMinimal {
  return {
    id: raw._id,
    title: raw.title,
  };
}

export function shapeRaindropSummary(raw: RaindropFull): RaindropSummary {
  return {
    id: raw._id,
    title: raw.title,
    domain: raw.domain,
    created: raw.created,
  };
}

export function shapeRaindropStandard(raw: RaindropFull): RaindropStandard {
  return {
    id: raw._id,
    title: raw.title,
    link: raw.link,
    domain: raw.domain,
    excerpt: raw.excerpt,
    tags: raw.tags,
    created: raw.created,
    important: raw.important,
    type: raw.type,
    collectionId: raw.collection?.$id,
  };
}

export function shapeRaindrop(
  raw: RaindropFull,
  level: FieldLevel
): Record<string, unknown> {
  const fields = RAINDROP_FIELDS[level];
  const shaped = shapeObject(raw as unknown as Record<string, unknown>, fields, { _id: "id" });

  // Handle nested collection reference
  if (shaped.collection && typeof shaped.collection === "object") {
    const col = shaped.collection as { $id?: number };
    shaped.collectionId = col.$id;
    delete shaped.collection;
  }

  return shaped;
}

export function shapeRaindrops<T>(
  items: RaindropFull[],
  level: FieldLevel
): T[] {
  return items.map((item) => shapeRaindrop(item, level) as T);
}

// ============ Collection Shapers ============

export function shapeCollectionMinimal(raw: CollectionFull): CollectionMinimal {
  return {
    id: raw._id,
    title: raw.title,
  };
}

export function shapeCollectionSummary(raw: CollectionFull): CollectionSummary {
  return {
    id: raw._id,
    title: raw.title,
    count: raw.count,
    parentId: raw.parent?.$id,
  };
}

export function shapeCollection(
  raw: CollectionFull,
  level: FieldLevel
): Record<string, unknown> {
  const fields = COLLECTION_FIELDS[level];
  const shaped = shapeObject(raw as unknown as Record<string, unknown>, fields, { _id: "id" });

  // Handle nested parent reference
  if (shaped.parent && typeof shaped.parent === "object") {
    const parent = shaped.parent as { $id?: number };
    shaped.parentId = parent.$id;
    delete shaped.parent;
  }

  return shaped;
}

export function shapeCollections<T>(
  items: CollectionFull[],
  level: FieldLevel
): T[] {
  return items.map((item) => shapeCollection(item, level) as T);
}

// ============ Tag Shaper ============

export function shapeTag(raw: { _id: string; count: number }): { name: string; count: number } {
  return {
    name: raw._id,
    count: raw.count,
  };
}

export function shapeTags(
  items: { _id: string; count: number }[]
): { name: string; count: number }[] {
  return items.map(shapeTag);
}

// ============ Pagination Helper ============

export function createPaginationMeta(
  total: number,
  page: number,
  perPage: number
): {
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  nextPage: number | null;
} {
  const totalPages = Math.ceil(total / perPage);
  const hasMore = page < totalPages - 1;

  return {
    total,
    page,
    perPage,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
}
