import * as vscode from "vscode";
import type { SkillLevel } from "./types";

export class ConfigManager {
	static readonly API_KEY_SECRET = "literate.openai.apiKey";
	static readonly SKILL_LEVEL_KEY = "literate.skillLevel";

	constructor(private readonly context: vscode.ExtensionContext) {}

	public async getApiKey(): Promise<string | undefined> {
		return await this.context.secrets.get(ConfigManager.API_KEY_SECRET);
	}

	public async setApiKey(apiKey: string): Promise<void> {
		await this.context.secrets.store(ConfigManager.API_KEY_SECRET, apiKey);
	}

	public async deleteApiKey(): Promise<void> {
		await this.context.secrets.delete(ConfigManager.API_KEY_SECRET);
	}

	public getSkillLevel(): SkillLevel | undefined {
		return this.context.globalState.get<SkillLevel>(
			ConfigManager.SKILL_LEVEL_KEY,
		);
	}

	public async setSkillLevel(skillLevel: SkillLevel): Promise<void> {
		await this.context.globalState.update(
			ConfigManager.SKILL_LEVEL_KEY,
			skillLevel,
		);
	}

	public async promptForApiKey(): Promise<string | undefined> {
		return await vscode.window.showInputBox({
			prompt: "Enter your OpenAI API key",
			placeHolder: "sk-...",
			password: true,
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) {
					return "API key is required";
				}
				if (!value.startsWith("sk-")) {
					return "Invalid API key format";
				}
				return null;
			},
		});
	}

	public async promptForSkillLevel(): Promise<SkillLevel | undefined> {
		const selection = await vscode.window.showQuickPick(
			[
				{
					label: "🌱 Beginner",
					description: "I just started learning to code",
					value: "beginner",
				},
				{
					label: "🌿 Intermediate",
					description:
						"I understand code but want to know why it's written that way",
					value: "intermediate",
				},
				{
					label: "🌳 Advanced",
					description:
						"I want deep technical insights and architectural analysis",
					value: "advanced",
				},
			],
			{
				placeHolder: "Select your coding experience level",
				title: "Documentation Detail Level",
			},
		);

		return selection?.value as SkillLevel | undefined;
	}
}
