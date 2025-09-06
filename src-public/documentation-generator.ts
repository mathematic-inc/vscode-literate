import OpenAI from "openai";
import * as vscode from "vscode";
import * as z from "zod";
import codeAnalyzerAdvanced from "../prompts/code-analyzer-advanced.md";
import codeAnalyzerBeginner from "../prompts/code-analyzer-beginner.md";
import codeAnalyzerIntermediate from "../prompts/code-analyzer-intermediate.md";
import {
	type Documentation,
	DocumentationSchema,
	type SkillLevel,
} from "./types";

export class DocumentationGenerator {
	private abortController?: AbortController;

	public async generate(
		text: string,
		apiKey: string,
		skillLevel: SkillLevel,
	): Promise<Documentation> {
		const analyzerPrompt = this.getAnalyzerPrompt(skillLevel);

		this.abortController = new AbortController();

		return await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Generating literate documentation...",
				cancellable: true,
			},
			async (_progress, token) => {
				token.onCancellationRequested(() => {
					this.abortController?.abort();
				});

				const client = new OpenAI({ apiKey });

				try {
					const response = await client.chat.completions.parse(
						{
							model: "gpt-5-mini-2025-08-07",
							reasoning_effort: "medium",
							messages: [
								{
									role: "system",
									content: analyzerPrompt,
								},
								{
									role: "user",
									content: text
										.split("\n")
										.map((line, idx) => `${idx + 1}: ${line}`)
										.join("\n"),
								},
							],
							response_format: {
								type: "json_schema",
								json_schema: {
									name: "documentation",
									strict: true,
									schema: z.toJSONSchema(DocumentationSchema),
								},
							},
						},
						{
							signal: this.abortController?.signal,
						},
					);

					const documentation = response.choices[0]?.message.parsed;
					if (!documentation) {
						throw new Error("Failed to parse documentation from AI response");
					}
					return documentation;
				} catch (error) {
					if (
						(error as Error)?.name === "AbortError" ||
						this.abortController?.signal.aborted
					) {
						vscode.window.showInformationMessage(
							"Documentation generation was cancelled",
						);
						throw error;
					}
					throw error;
				} finally {
					this.abortController = undefined;
				}
			},
		);
	}

	private getAnalyzerPrompt(skillLevel: SkillLevel): string {
		switch (skillLevel) {
			case "beginner":
				return codeAnalyzerBeginner;
			case "advanced":
				return codeAnalyzerAdvanced;
			default:
				return codeAnalyzerIntermediate;
		}
	}

	public cancel(): void {
		this.abortController?.abort();
	}
}
