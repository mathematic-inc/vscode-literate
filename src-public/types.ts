import * as z from "zod";

export const RangeSchema = z.object({
	start: z
		.number()
		.describe("The starting line number of the range. Start is 1-based"),
	end: z
		.number()
		.describe("The ending line number of the range. End is inclusive."),
});

export const ProseSchema = z.object({
	lines: z
		.array(RangeSchema)
		.describe("Line ranges in the source code this documentation refers to"),
	text: z.string().describe("The documentation text in markdown format"),
});

export const DocumentationSchema = z.object({
	sections: z.array(ProseSchema).describe("The sections of the documentation"),
});

export type Documentation = z.infer<typeof DocumentationSchema>;
export type SkillLevel = "beginner" | "intermediate" | "advanced";
