import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  title: z.string().describe("The bookmark title"),
  excerpt: z.string().optional().describe("Description/excerpt from the page"),
  domain: z.string().describe("The website domain"),
  type: z
    .string()
    .optional()
    .describe("Content type: link, article, image, video, document, audio"),
  highlights: z
    .array(z.string())
    .optional()
    .describe("User's highlighted text from the page"),
  note: z.string().optional().describe("User's personal notes"),
  existingTags: z
    .array(z.string())
    .optional()
    .describe("Tags already assigned to this bookmark"),
  raindropSuggestions: z
    .array(z.string())
    .optional()
    .describe("Raindrop.io's algorithmic tag suggestions"),
  userVocabulary: z
    .array(z.string())
    .optional()
    .describe("User's existing tags (for consistency)"),
};

export const metadata: PromptMetadata = {
  name: "generate-tags",
  title: "Generate Tags for Bookmark",
  description:
    "Analyze bookmark metadata and generate relevant, consistent tags",
  role: "user",
};

export default function generateTags({
  title,
  excerpt,
  domain,
  type,
  highlights,
  note,
  existingTags,
  raindropSuggestions,
  userVocabulary,
}: InferSchema<typeof schema>) {
  const sections: string[] = [];

  // Bookmark Information
  sections.push("## Bookmark Information");
  sections.push(`- **Title:** ${title}`);
  sections.push(`- **Domain:** ${domain}`);
  if (type) sections.push(`- **Type:** ${type}`);
  if (excerpt) sections.push(`- **Excerpt:** ${excerpt}`);
  if (note) sections.push(`- **User Notes:** ${note}`);
  if (highlights && highlights.length > 0) {
    sections.push(`- **Highlights:** ${highlights.join("; ")}`);
  }

  // Context
  sections.push("\n## Context");
  if (raindropSuggestions && raindropSuggestions.length > 0) {
    sections.push(
      `- **Raindrop's suggestions:** ${raindropSuggestions.join(", ")}`
    );
  }
  if (userVocabulary && userVocabulary.length > 0) {
    sections.push(
      `- **User's existing tags (prefer these for consistency):** ${userVocabulary.slice(0, 30).join(", ")}`
    );
  }
  if (existingTags && existingTags.length > 0) {
    sections.push(`- **Currently assigned:** ${existingTags.join(", ")}`);
  }

  // Guidelines
  sections.push("\n## Guidelines");
  sections.push("1. **Prefer existing tags** from user's vocabulary for consistency");
  sections.push("2. **Use lowercase, hyphenated format** (e.g., 'machine-learning' not 'Machine Learning')");
  sections.push("3. **Suggest 3-7 tags** covering:");
  sections.push("   - Topic/subject matter");
  sections.push("   - Content format (tutorial, reference, news, etc.)");
  sections.push("   - Technology/tools mentioned");
  sections.push("   - Purpose (learning, reference, inspiration, etc.)");
  sections.push("4. **Consider Raindrop's suggestions** but don't blindly accept them");
  sections.push("5. **Be specific** - 'react-hooks' is better than just 'react'");

  // Output format
  sections.push("\n## Output");
  sections.push("Return tags as a JSON array of lowercase strings:");
  sections.push('```json\n["tag1", "tag2", "tag3"]\n```');

  return sections.join("\n");
}
