import * as vscode from "vscode";
import { CacheManager } from "./cache-manager";
import { ConfigManager } from "./config-manager";
import { DocumentationGenerator } from "./documentation-generator";
import type { Documentation, SkillLevel } from "./types";
import { WebviewManager } from "./webview-manager";

class LiteratePanelManager {
	private documentation: Documentation = { sections: [] };
	private currentEditor?: vscode.TextEditor;
	private readonly cacheManager: CacheManager;
	private readonly webviewManager: WebviewManager;
	private readonly documentationGenerator: DocumentationGenerator;
	private static hasShownCTA = false;

	constructor(readonly extensionUri: vscode.Uri) {
		this.cacheManager = new CacheManager();
		this.webviewManager = new WebviewManager(extensionUri);
		this.documentationGenerator = new DocumentationGenerator();
	}

	public async updateContent(
		context: vscode.ExtensionContext,
		editor: vscode.TextEditor,
		forceRegenerate: boolean = false,
	) {
		try {
			this.currentEditor = editor;
			const document = editor.document;
			const text = document.getText();
			const filePath = document.fileName;
			const configManager = new ConfigManager(context);

			// Get API key from secure storage
			let apiKey = await configManager.getApiKey();

			// Get skill level preference
			let skillLevel = configManager.getSkillLevel();
			if (!skillLevel) {
				skillLevel = await configManager.promptForSkillLevel();
				if (!skillLevel) {
					vscode.window.showInformationMessage(
						"Skill level selection is required",
					);
					return;
				}
				await configManager.setSkillLevel(skillLevel);
			}

			// Check cache if not forcing regeneration
			if (!forceRegenerate) {
				const cachedDoc = this.cacheManager.load(filePath, text, skillLevel);
				if (cachedDoc) {
					this.documentation = cachedDoc;
					this.webviewManager.show(
						context,
						document.fileName,
						this.documentation,
						this.currentEditor,
					);
					vscode.window.showInformationMessage(
						"Loaded documentation from cache",
					);
					return;
				}
			}

			if (!apiKey) {
				apiKey = await configManager.promptForApiKey();
				if (!apiKey) {
					vscode.window.showInformationMessage(
						"API key is required to generate documentation",
					);
					return;
				}
				await configManager.setApiKey(apiKey);
			}

			// Generate documentation
			try {
				const documentation = await this.documentationGenerator.generate(
					text,
					apiKey,
					skillLevel,
				);
				this.documentation = documentation;

				// Save to cache
				this.cacheManager.save(filePath, text, skillLevel, documentation);

				// Show in webview
				this.webviewManager.show(
					context,
					document.fileName,
					this.documentation,
					this.currentEditor,
				);

				// Show CTA only once per session
				if (!LiteratePanelManager.hasShownCTA) {
					LiteratePanelManager.hasShownCTA = true;
					setTimeout(() => {
						vscode.window.showInformationMessage(
							"💡 Need documentation for your entire codebase? Join the Literate waitlist!",
							"Learn More",
							"Not Now"
						).then((selection) => {
							if (selection === "Learn More") {
								vscode.env.openExternal(vscode.Uri.parse("https://literate-mu.vercel.app"));
							}
						});
					}, 3000); // Show after 3 seconds
				}
			} catch (error) {
				if ((error as Error)?.name === "AbortError") {
					return; // User cancelled, message already shown
				}
				throw error;
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to generate literate documentation: ${error}`,
			);
		}
	}

	public hasCachedDocumentation(
		filePath: string,
		content: string,
		skillLevel: SkillLevel,
	): boolean {
		return this.cacheManager.exists(filePath, content, skillLevel);
	}

	public dispose(): void {
		this.webviewManager.dispose();
	}
}

class LiterateCodeLensProvider implements vscode.CodeLensProvider {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly panelManager: LiteratePanelManager,
	) {}

	provideCodeLenses(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.CodeLens[]> {
		const configManager = new ConfigManager(this.context);
		const skillLevel = configManager.getSkillLevel();
		const skillEmoji =
			skillLevel === "beginner"
				? "🌱"
				: skillLevel === "advanced"
					? "🌳"
					: "🌿";
		const skillLabel = skillLevel ? ` (${skillEmoji} ${skillLevel})` : "";

		// Check if cache exists for this document
		const text = document.getText();
		const hasCached = skillLevel
			? this.panelManager.hasCachedDocumentation(
					document.fileName,
					text,
					skillLevel,
				)
			: false;

		// Add a code lens at the top of the file
		const topOfDocument = new vscode.Range(0, 0, 0, 0);
		const codeLenses: vscode.CodeLens[] = [];

		// If cached, add View Document option first
		if (hasCached) {
			const viewCommand: vscode.Command = {
				title: `👁️ View Document${skillLabel}`,
				command: "literate.viewCachedDocs",
				arguments: [document],
			};
			codeLenses.push(new vscode.CodeLens(topOfDocument, viewCommand));
		}

		// Add generate/regenerate command
		const generateCommand: vscode.Command = {
			title: hasCached
				? `📖 Regenerate Documentation${skillLabel}`
				: `📖 Generate Literate Documentation${skillLabel}`,
			command: "literate.generateDocs",
			arguments: [document, hasCached],
		};
		codeLenses.push(new vscode.CodeLens(topOfDocument, generateCommand));

		// Add code lens for changing skill level
		const changeSkillCommand: vscode.Command = {
			title: "🎯 Change Skill Level",
			command: "literate.changeSkillLevel",
			arguments: [],
		};
		codeLenses.push(new vscode.CodeLens(topOfDocument, changeSkillCommand));

		return codeLenses;
	}
}

export async function activate(context: vscode.ExtensionContext) {
	console.log("Literate extension is now active!");

	const panelManager = new LiteratePanelManager(context.extensionUri);
	const configManager = new ConfigManager(context);

	// Register the command to generate documentation
	const generateDocsCommand = vscode.commands.registerCommand(
		"literate.generateDocs",
		async (_document?: vscode.TextDocument, forceRegenerate?: boolean) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage("No active editor found");
				return;
			}
			await panelManager.updateContent(
				context,
				editor,
				forceRegenerate || false,
			);
		},
	);

	// Register command to reset API key
	const resetApiKeyCommand = vscode.commands.registerCommand(
		"literate.resetApiKey",
		async () => {
			await configManager.deleteApiKey();
			vscode.window.showInformationMessage(
				"OpenAI API key has been reset. You will be prompted for a new key on next use.",
			);
		},
	);

	// Register command to change skill level
	const changeSkillLevelCommand = vscode.commands.registerCommand(
		"literate.changeSkillLevel",
		async () => {
			const skillLevel = await configManager.promptForSkillLevel();
			if (skillLevel) {
				await configManager.setSkillLevel(skillLevel);
				vscode.window.showInformationMessage(
					`Documentation level changed to ${skillLevel}`,
				);
			}
		},
	);

	// Register command to view cached documentation
	const viewCachedDocsCommand = vscode.commands.registerCommand(
		"literate.viewCachedDocs",
		async (_document?: vscode.TextDocument) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage("No active editor found");
				return;
			}
			await panelManager.updateContent(context, editor, false);
		},
	);

	// Register the code lens provider
	const codeLensProvider = vscode.languages.registerCodeLensProvider(
		{ pattern: "**/*" }, // Apply to all files
		new LiterateCodeLensProvider(context, panelManager),
	);

	context.subscriptions.push(
		generateDocsCommand,
		resetApiKeyCommand,
		changeSkillLevelCommand,
		viewCachedDocsCommand,
		codeLensProvider,
	);
}

export function deactivate() {}
