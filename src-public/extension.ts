import OpenAI from "openai";
import * as vscode from "vscode";
import * as z from "zod";
import codeAnalyzerAdvanced from "../prompts/code-analyzer-advanced.md";
import codeAnalyzerBeginner from "../prompts/code-analyzer-beginner.md";
import codeAnalyzerIntermediate from "../prompts/code-analyzer-intermediate.md";

const RangeSchema = z.object({
	start: z
		.number()
		.describe("The starting line number of the range. Start is 1-based"),
	end: z
		.number()
		.describe("The ending line number of the range. End is inclusive."),
});

const ProseSchema = z.object({
	lines: z
		.array(RangeSchema)
		.describe("Line ranges in the source code this documentation refers to"),
	text: z.string().describe("The documentation text in markdown format"),
});

const DocumentationSchema = z.object({
	sections: z.array(ProseSchema).describe("The sections of the documentation"),
});
type Documentation = z.infer<typeof DocumentationSchema>;

type SkillLevel = "beginner" | "intermediate" | "advanced";

class LiteratePanelManager {
	static readonly API_KEY_SECRET = "literate.openai.apiKey";
	static readonly SKILL_LEVEL_KEY = "literate.skillLevel";

	private _panel?: vscode.WebviewPanel;
	private _documentation: Documentation = { sections: [] };
	private _currentEditor?: vscode.TextEditor;
	private _selectionListener?: vscode.Disposable;
	private _abortController?: AbortController;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	private _renderMarkdown(text: string): string {
		return `<div class="markdown-content" data-markdown="true">${text}</div>`;
	}

	public async updateContent(
		context: vscode.ExtensionContext,
		editor: vscode.TextEditor,
	) {
		try {
			this._currentEditor = editor;
			const document = editor.document;
			const text = document.getText();

			// Get API key from secure storage
			let apiKey = await context.secrets.get(
				LiteratePanelManager.API_KEY_SECRET,
			);

			// Get skill level preference
			let skillLevel = context.globalState.get<SkillLevel>(
				LiteratePanelManager.SKILL_LEVEL_KEY,
			);
			if (!skillLevel) {
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

				if (!selection) {
					vscode.window.showInformationMessage(
						"Skill level selection is required",
					);
					return;
				}

				skillLevel = selection.value as SkillLevel;
				await context.globalState.update(
					LiteratePanelManager.SKILL_LEVEL_KEY,
					skillLevel,
				);
			}

			// Select appropriate analyzer based on skill level
			const analyzerPrompt =
				skillLevel === "beginner"
					? codeAnalyzerBeginner
					: skillLevel === "advanced"
						? codeAnalyzerAdvanced
						: codeAnalyzerIntermediate;

			if (!apiKey) {
				// Prompt for API key
				apiKey = await vscode.window.showInputBox({
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

				if (!apiKey) {
					vscode.window.showInformationMessage(
						"API key is required to generate documentation",
					);
					return;
				}

				// Store the API key securely
				await context.secrets.store(
					LiteratePanelManager.API_KEY_SECRET,
					apiKey,
				);
			}

			// Create abort controller for cancellation
			const abortController = new AbortController();
			this._abortController = abortController;

			// Show progress notification with cancellation
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Generating literate documentation...",
					cancellable: true,
				},
				async (progress, token) => {
					// Handle cancellation
					token.onCancellationRequested(() => {
						abortController.abort();
					});
					const client = new OpenAI({
						apiKey,
					});

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
								signal: abortController.signal,
							},
						);

						const documentation = response.choices[0].message.parsed;
						if (!documentation) {
							throw new Error("Failed to parse documentation from AI response");
						}
						this._documentation = documentation;
					} catch (error: any) {
						if (
							error?.name === "AbortError" ||
							abortController.signal.aborted
						) {
							vscode.window.showInformationMessage(
								"Documentation generation was cancelled",
							);
							return;
						}
						throw error;
					} finally {
						this._abortController = undefined;
					}
				},
			);

			// Show panel and update content
			this.showPanel(context);
			if (this._panel) {
				this._panel.webview.html = this._getHtmlForWebview(
					this._panel.webview,
					document.fileName,
				);

				// Set up selection listener
				this._setupSelectionListener(context);
			}
		} catch (error) {
			if (
				error instanceof Error &&
				error?.name !== "AbortError" &&
				!this._abortController?.signal.aborted
			) {
				vscode.window.showErrorMessage(
					`Failed to generate literate documentation: ${error}`,
				);
			}
		}
	}

	public showPanel(context: vscode.ExtensionContext) {
		const columnToShowIn = vscode.ViewColumn.Two;

		if (this._panel) {
			this._panel.reveal(columnToShowIn);
		} else {
			this._panel = vscode.window.createWebviewPanel(
				"literatePanel",
				"Literate Documentation",
				columnToShowIn,
				{
					enableScripts: true,
					localResourceRoots: [this._extensionUri],
					retainContextWhenHidden: true,
				},
			);

			this._panel.onDidDispose(
				() => {
					this._panel = undefined;
					if (this._selectionListener) {
						this._selectionListener.dispose();
					}
				},
				null,
				context.subscriptions,
			);

			// Handle messages from webview
			this._panel.webview.onDidReceiveMessage(
				async (message) => {
					if (message.command === "highlightLines" && this._currentEditor) {
						const startLine = message.startLine - 1;
						const endLine = message.endLine - 1;
						const selection = new vscode.Selection(
							new vscode.Position(startLine, 0),
							new vscode.Position(
								endLine,
								this._currentEditor.document.lineAt(endLine).text.length,
							),
						);
						this._currentEditor.selection = selection;
						this._currentEditor.revealRange(
							selection,
							vscode.TextEditorRevealType.InCenter,
						);
					}
				},
				null,
				context.subscriptions,
			);
		}
	}

	private _setupSelectionListener(context: vscode.ExtensionContext) {
		// Dispose old listener if exists
		if (this._selectionListener) {
			this._selectionListener.dispose();
		}

		this._selectionListener = vscode.window.onDidChangeTextEditorSelection(
			(e) => {
				if (e.textEditor === this._currentEditor && this._panel) {
					const currentLine = e.selections[0].active.line + 1;
					this._panel.webview.postMessage({
						command: "highlightProse",
						line: currentLine,
					});
				}
			},
		);

		context.subscriptions.push(this._selectionListener);
	}

	private _getHtmlForWebview(_webview: vscode.Webview, fileName: string) {
		// Build HTML with prose-only structure
		let contentHtml = "";

		// Check if we have any documentation
		if (this._documentation.sections.length === 0) {
			contentHtml = `
				<div class="empty-state">
					<div class="empty-state-message">
						No documentation generated
					</div>
					<div class="empty-state-hint">
						The AI was unable to generate documentation for this file.
					</div>
				</div>
			`;
		} else {
			// Create prose blocks with line range data
			for (
				let index = 0;
				index < this._documentation.sections.length;
				index++
			) {
				const section = this._documentation.sections[index];
				const lineRanges = section.lines
					.map((r) => `${r.start}-${r.end}`)
					.join(",");

				contentHtml += `
					<div class="prose-block" data-lines="${lineRanges}" data-index="${index}">
						<div class="line-indicator">
							Lines: ${section.lines.map((r) => (r.start === r.end ? r.start : `${r.start}-${r.end}`)).join(", ")}
						</div>
						<div class="prose-documentation">
							${this._renderMarkdown(section.text)}
						</div>
					</div>
				`;
			}
		}

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Literate - ${fileName}</title>
				<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
				<style>
					body {
						padding: 20px;
						margin: 0;
						background-color: var(--vscode-editor-background);
						color: var(--vscode-editor-foreground);
						font-family: var(--vscode-font-family);
						font-size: 14px;
						line-height: 1.6;
					}
					
					h1 {
						color: var(--vscode-editor-foreground);
						font-size: 14px;
						font-weight: 400;
						margin: 0 0 20px 0;
						opacity: 0.7;
					}
					
					.prose-block {
						margin-bottom: 24px;
						overflow: hidden;
						transition: opacity 0.2s ease;
						cursor: pointer;
						position: relative;
						padding-left: 3px;
						border-left: 3px solid transparent;
					}
					
					.prose-block:hover {
						border-left-color: var(--vscode-editorGutter-modifiedBackground);
					}
					
					.prose-block.highlighted {
						border-left-color: var(--vscode-editor-foreground);
						opacity: 1;
					}
					
					.prose-block:not(.highlighted) {
						opacity: 0.8;
					}
					
					.line-indicator {
						padding: 2px 0;
						color: var(--vscode-descriptionForeground);
						font-size: 11px;
						font-weight: 400;
						display: inline-block;
						margin: 0 0 2px 12px;
						opacity: 0.6;
					}
					
					.prose-documentation {
						padding: 0 0 12px 12px;
						line-height: 1.7;
						font-size: 15px;
					}
					
					.prose-documentation h1,
					.prose-documentation h2,
					.prose-documentation h3,
					.prose-documentation h4,
					.prose-documentation h5,
					.prose-documentation h6 {
						margin-top: 1em;
						margin-bottom: 0.5em;
						color: var(--vscode-editor-foreground);
					}
					
					.prose-documentation p {
						margin: 0.8em 0;
					}
					
					.prose-documentation ul,
					.prose-documentation ol {
						padding-left: 1.5em;
						margin: 0.5em 0;
					}
					
					.prose-documentation code {
						background-color: var(--vscode-textCodeBlock-background);
						padding: 2px 4px;
						border-radius: 3px;
						font-size: 0.9em;
					}
					
					.prose-documentation pre {
						background-color: var(--vscode-textCodeBlock-background);
						padding: 10px;
						border-radius: 4px;
						overflow-x: auto;
						margin: 10px 0;
					}
					
					.prose-documentation blockquote {
						border-left: 3px solid var(--vscode-textBlockQuote-border);
						padding-left: 1em;
						margin: 0.5em 0;
						color: var(--vscode-textBlockQuote-foreground);
					}
					
					.empty-state {
						padding: 50px;
						text-align: center;
						opacity: 0.6;
					}
					
					.empty-state-message {
						color: var(--vscode-editor-foreground);
						font-size: 14px;
						margin-bottom: 8px;
					}
					
					.empty-state-hint {
						color: var(--vscode-descriptionForeground);
						font-size: 12px;
					}
				</style>
			</head>
			<body>
				<h1>📖 ${fileName.split("/").pop()}</h1>
				<div class="content">
					${contentHtml}
				</div>
				<script>
					const vscode = acquireVsCodeApi();
					
					// Parse line ranges from data attribute
					function parseLineRanges(rangeStr) {
						const ranges = [];
						for (const part of rangeStr.split(',')) {
							const [start, end] = part.split('-').map(n => parseInt(n));
							ranges.push({ start, end: end || start });
						}
						return ranges;
					}
					
					// Check if a line is within any range
					function isLineInRanges(line, ranges) {
						return ranges.some(r => line >= r.start && line <= r.end);
					}
					
					// Render markdown content on load
					document.addEventListener('DOMContentLoaded', () => {
						const markdownElements = document.querySelectorAll('.markdown-content');
						markdownElements.forEach(element => {
							const rawText = element.textContent;
							element.innerHTML = marked.parse(rawText);
						});
						
						// Add click handlers to prose blocks
						document.querySelectorAll('.prose-block').forEach(block => {
							block.addEventListener('click', () => {
								const ranges = parseLineRanges(block.dataset.lines);
								if (ranges.length > 0) {
									vscode.postMessage({
										command: 'highlightLines',
										startLine: ranges[0].start,
										endLine: ranges[ranges.length - 1].end
									});
								}
							});
						});
					});
					
					// Listen for messages from extension
					window.addEventListener('message', event => {
						const message = event.data;
						if (message.command === 'highlightProse') {
							const currentLine = message.line;
							
							// Remove all highlights
							document.querySelectorAll('.prose-block').forEach(block => {
								block.classList.remove('highlighted');
							});
							
							// Find and highlight matching prose block
							document.querySelectorAll('.prose-block').forEach(block => {
								const ranges = parseLineRanges(block.dataset.lines);
								if (isLineInRanges(currentLine, ranges)) {
									block.classList.add('highlighted');
									block.scrollIntoView({ behavior: 'smooth', block: 'center' });
								}
							});
						}
					});
				</script>
			</body>
			</html>`;
	}
}

class LiterateCodeLensProvider implements vscode.CodeLensProvider {
	constructor(private readonly context: vscode.ExtensionContext) {}

	provideCodeLenses(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.CodeLens[]> {
		// Get current skill level
		const skillLevel = this.context.globalState.get<SkillLevel>(
			LiteratePanelManager.SKILL_LEVEL_KEY,
		);
		const skillEmoji =
			skillLevel === "beginner"
				? "🌱"
				: skillLevel === "advanced"
					? "🌳"
					: "🌿";
		const skillLabel = skillLevel ? ` (${skillEmoji} ${skillLevel})` : "";

		// Add a code lens at the top of the file
		const topOfDocument = new vscode.Range(0, 0, 0, 0);
		const generateCommand: vscode.Command = {
			title: `📖 Generate Literate Documentation${skillLabel}`,
			command: "literate.generateDocs",
			arguments: [document],
		};

		// Add code lens for changing skill level
		const changeSkillCommand: vscode.Command = {
			title: "🎯 Change Skill Level",
			command: "literate.changeSkillLevel",
			arguments: [],
		};

		return [
			new vscode.CodeLens(topOfDocument, generateCommand),
			new vscode.CodeLens(topOfDocument, changeSkillCommand),
		];
	}
}

export async function activate(context: vscode.ExtensionContext) {
	console.log("Literate extension is now active!");

	const panelManager = new LiteratePanelManager(context.extensionUri);

	// Register the command to generate documentation
	const generateDocsCommand = vscode.commands.registerCommand(
		"literate.generateDocs",
		async (_document?: vscode.TextDocument) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage("No active editor found");
				return;
			}
			await panelManager.updateContent(context, editor);
		},
	);

	// Register command to reset API key
	const resetApiKeyCommand = vscode.commands.registerCommand(
		"literate.resetApiKey",
		async () => {
			await context.secrets.delete(LiteratePanelManager.API_KEY_SECRET);
			vscode.window.showInformationMessage(
				"OpenAI API key has been reset. You will be prompted for a new key on next use.",
			);
		},
	);

	// Register command to change skill level
	const changeSkillLevelCommand = vscode.commands.registerCommand(
		"literate.changeSkillLevel",
		async () => {
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

			if (selection) {
				await context.globalState.update(
					LiteratePanelManager.SKILL_LEVEL_KEY,
					selection.value,
				);
				vscode.window.showInformationMessage(
					`Documentation level changed to ${selection.label}`,
				);
			}
		},
	);

	// Register the code lens provider
	const codeLensProvider = vscode.languages.registerCodeLensProvider(
		{ pattern: "**/*" }, // Apply to all files
		new LiterateCodeLensProvider(context),
	);

	context.subscriptions.push(
		generateDocsCommand,
		resetApiKeyCommand,
		changeSkillLevelCommand,
		codeLensProvider,
	);
}

export function deactivate() {}
