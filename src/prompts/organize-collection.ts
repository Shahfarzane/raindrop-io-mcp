import type { InferSchema, PromptMetadata } from "xmcp";
import { z } from "zod";

export const schema = {
	collectionData: z
		.string()
		.describe("JSON string containing collection analysis data"),
	goal: z
		.enum(["simplify", "expand", "topic-based"])
		.optional()
		.describe(
			"Organization goal: simplify (reduce collections), expand (more granular), topic-based (reorganize by topics)",
		),
};

export const metadata: PromptMetadata = {
	name: "organize-collection",
	title: "Organize Collection",
	description:
		"Analyze collection structure and suggest improvements for organization",
	role: "user",
};

export default function organizeCollection({
	collectionData,
	goal,
}: InferSchema<typeof schema>) {
	const sections: string[] = [];

	sections.push("# Collection Organization Analysis");
	sections.push("");
	sections.push("## Current Structure");
	sections.push("```json");
	sections.push(collectionData);
	sections.push("```");

	if (goal) {
		sections.push("");
		sections.push(`## Organization Goal: ${goal}`);
		switch (goal) {
			case "simplify":
				sections.push(
					"Focus on reducing the number of collections by merging similar ones.",
				);
				break;
			case "expand":
				sections.push("Focus on creating more granular, specific collections.");
				break;
			case "topic-based":
				sections.push(
					"Focus on reorganizing by logical topics regardless of current structure.",
				);
				break;
		}
	}

	sections.push("");
	sections.push("## Analysis Tasks");
	sections.push(
		"1. **Identify Similar Collections**: Find collections that could be merged",
	);
	sections.push(
		"2. **Find Oversized Collections**: Collections with many items that should be split",
	);
	sections.push(
		"3. **Detect Miscategorized Items**: Raindrops that belong in different collections",
	);
	sections.push(
		"4. **Suggest New Collections**: Topics that deserve their own collection",
	);
	sections.push(
		"5. **Identify Unused Collections**: Empty or rarely-used collections to remove",
	);

	sections.push("");
	sections.push("## Output Format");
	sections.push("Provide your recommendations as JSON:");
	sections.push("```json");
	sections.push(
		JSON.stringify(
			{
				merge: [
					{
						collections: ["collection-a", "collection-b"],
						into: "new-name",
						reason: "...",
					},
				],
				split: [
					{
						collection: "oversized-collection",
						into: ["topic-1", "topic-2"],
						reason: "...",
					},
				],
				move: [
					{ raindropId: 123, from: "current", to: "better-fit", reason: "..." },
				],
				create: [{ name: "new-collection", parentId: null, reason: "..." }],
				delete: [{ collection: "unused-collection", reason: "..." }],
				summary: "Brief explanation of overall recommendations",
			},
			null,
			2,
		),
	);
	sections.push("```");

	return sections.join("\n");
}
