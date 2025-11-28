import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

const itemSchema = z.object({
  id: z.number(),
  title: z.string(),
  domain: z.string(),
  excerpt: z.string().optional(),
  type: z.string().optional(),
  link: z.string().optional(),
});

export const schema = {
  items: z.array(itemSchema).describe("Array of untagged bookmarks to process"),
  userVocabulary: z
    .array(z.string())
    .optional()
    .describe("User's existing tags for consistency"),
  maxTagsPerItem: z
    .number()
    .default(5)
    .describe("Maximum tags to suggest per item"),
};

export const metadata: PromptMetadata = {
  name: "batch-tag-items",
  title: "Batch Tag Multiple Bookmarks",
  description:
    "Analyze multiple bookmarks and generate tags for each, outputting in a format ready for batch_apply_tags",
  role: "user",
};

export default function batchTagItems({
  items,
  userVocabulary,
  maxTagsPerItem,
}: InferSchema<typeof schema>) {
  const sections: string[] = [];

  sections.push("# Batch Tagging Task");
  sections.push("");
  sections.push(`You need to analyze ${items.length} bookmarks and generate tags for each.`);

  // User vocabulary
  if (userVocabulary && userVocabulary.length > 0) {
    sections.push("");
    sections.push("## User's Existing Tag Vocabulary");
    sections.push("**Prefer these tags for consistency:**");
    sections.push(userVocabulary.slice(0, 50).join(", "));
  }

  // Guidelines
  sections.push("");
  sections.push("## Tagging Guidelines");
  sections.push("1. **Prefer existing tags** from the user's vocabulary");
  sections.push("2. **Use lowercase, hyphenated format** (e.g., 'web-design' not 'Web Design')");
  sections.push(`3. **Generate ${maxTagsPerItem} tags maximum** per item`);
  sections.push("4. **Be specific** - 'react-hooks' is better than just 'react'");
  sections.push("5. **Consider the domain** as context for what the content is about");
  sections.push("6. **Common tag categories:**");
  sections.push("   - Topic (ai, design, programming, etc.)");
  sections.push("   - Format (tutorial, article, tool, reference)");
  sections.push("   - Technology (react, python, css, etc.)");
  sections.push("   - Purpose (learning, inspiration, bookmark)");

  // Items to process
  sections.push("");
  sections.push("## Bookmarks to Tag");
  sections.push("");

  for (const item of items) {
    sections.push(`### ID: ${item.id}`);
    sections.push(`- **Title:** ${item.title}`);
    sections.push(`- **Domain:** ${item.domain}`);
    if (item.type) sections.push(`- **Type:** ${item.type}`);
    if (item.excerpt) sections.push(`- **Excerpt:** ${item.excerpt}`);
    if (item.link) sections.push(`- **Link:** ${item.link}`);
    sections.push("");
  }

  // Output format
  sections.push("## Required Output Format");
  sections.push("");
  sections.push("Return a JSON array ready for the `batch_apply_tags` tool:");
  sections.push("```json");
  sections.push("[");
  sections.push('  { "id": 123, "tags": ["tag1", "tag2", "tag3"] },');
  sections.push('  { "id": 456, "tags": ["tag1", "tag4", "tag5"] }');
  sections.push("]");
  sections.push("```");
  sections.push("");
  sections.push("**Important:** Return ONLY the JSON array, no other text.");

  return sections.join("\n");
}
