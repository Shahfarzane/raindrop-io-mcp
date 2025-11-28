import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

const tagSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export const schema = {
  tags: z.array(tagSchema).describe("Array of tags with their counts"),
  existingCollections: z
    .array(z.string())
    .optional()
    .describe("Names of existing collections to consider"),
};

export const metadata: PromptMetadata = {
  name: "suggest-collection-structure",
  title: "Suggest Collection Structure",
  description:
    "Analyze tags and suggest a hierarchical collection structure for organizing bookmarks",
  role: "user",
};

export default function suggestCollectionStructure({
  tags,
  existingCollections,
}: InferSchema<typeof schema>) {
  const sections: string[] = [];

  sections.push("# Collection Structure Analysis");
  sections.push("");
  sections.push(
    "Analyze these tags and suggest a clean, hierarchical collection structure."
  );

  // Tag data
  sections.push("");
  sections.push("## Current Tags by Count");
  sections.push("");
  sections.push("| Tag | Count |");
  sections.push("|-----|-------|");
  for (const tag of tags.slice(0, 30)) {
    sections.push(`| ${tag.name} | ${tag.count} |`);
  }

  // Existing collections
  if (existingCollections && existingCollections.length > 0) {
    sections.push("");
    sections.push("## Existing Collections");
    sections.push("Consider integrating with these existing collections:");
    for (const col of existingCollections) {
      sections.push(`- ${col}`);
    }
  }

  // Guidelines
  sections.push("");
  sections.push("## Guidelines for Collection Structure");
  sections.push("");
  sections.push("1. **Create logical parent categories** that group related tags");
  sections.push("   - Example: 'Design' parent with 'UI', 'Animation', 'Portfolio' children");
  sections.push("   - Example: 'AI & Tech' parent with 'AI', 'Agents', 'Tools' children");
  sections.push("");
  sections.push("2. **Keep hierarchy shallow** - max 2 levels (parent → child)");
  sections.push("");
  sections.push("3. **Group by user intent**, not just tag similarity:");
  sections.push("   - 'Shopping' + 'Fashion' + 'Clothing' → 'Shopping & Style'");
  sections.push("   - 'Tools' + 'Components' → could go under 'Development Resources'");
  sections.push("");
  sections.push("4. **Consider these common parent categories:**");
  sections.push("   - Design & Creative (design, ui, animation, portfolio, creative)");
  sections.push("   - AI & Technology (ai, agents, tools)");
  sections.push("   - Development (tools, components, code)");
  sections.push("   - Shopping & Lifestyle (shopping, fashion, home, clothing)");
  sections.push("   - Reading & Reference (article, documentation)");
  sections.push("");
  sections.push("5. **Map tags to collections** - specify which tags go into each collection");

  // Output format
  sections.push("");
  sections.push("## Required Output Format");
  sections.push("");
  sections.push("Return a JSON structure ready for the `create_collection_hierarchy` tool:");
  sections.push("```json");
  sections.push("{");
  sections.push('  "collections": [');
  sections.push("    {");
  sections.push('      "name": "Design & Creative",');
  sections.push('      "tags": ["design", "ui", "animation", "creative", "portfolio"],');
  sections.push('      "children": [');
  sections.push('        { "name": "UI Components", "tags": ["ui", "components"] },');
  sections.push('        { "name": "Portfolios & Studios", "tags": ["portfolio", "studio"] }');
  sections.push("      ]");
  sections.push("    },");
  sections.push("    {");
  sections.push('      "name": "AI & Technology",');
  sections.push('      "tags": ["ai", "agents", "tools"],');
  sections.push('      "children": []');
  sections.push("    }");
  sections.push("  ]");
  sections.push("}");
  sections.push("```");
  sections.push("");
  sections.push("**Notes:**");
  sections.push("- `tags` array lists which tags should be moved to that collection");
  sections.push("- `children` can be empty if no sub-collections needed");
  sections.push("- A tag can appear in both parent and child (child takes precedence)");
  sections.push("- Return ONLY the JSON, no other text");

  return sections.join("\n");
}
