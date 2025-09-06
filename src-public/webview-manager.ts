import * as vscode from "vscode";
import { generateWebviewHTML } from "./html-generator";
import type { Documentation } from "./types";

export class WebviewManager {
	private panel?: vscode.WebviewPanel;
	private selectionListener?: vscode.Disposable;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public getPanel(): vscode.WebviewPanel | undefined {
		return this.panel;
	}

	public show(
		context: vscode.ExtensionContext,
		fileName: string,
		documentation: Documentation,
		currentEditor?: vscode.TextEditor,
	): void {
		const columnToShowIn = vscode.ViewColumn.Two;

		if (this.panel) {
			this.panel.reveal(columnToShowIn);
		} else {
			this.createPanel(context, currentEditor);
		}

		if (this.panel) {
			this.updateContent(fileName, documentation);
			this.setupSelectionListener(context, currentEditor);
		}
	}

	private createPanel(
		context: vscode.ExtensionContext,
		currentEditor?: vscode.TextEditor,
	): void {
		this.panel = vscode.window.createWebviewPanel(
			"literatePanel",
			"Literate Documentation",
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [this.extensionUri],
				retainContextWhenHidden: true,
			},
		);

		this.panel.onDidDispose(
			() => {
				this.panel = undefined;
				if (this.selectionListener) {
					this.selectionListener.dispose();
				}
			},
			null,
			context.subscriptions,
		);

		this.panel.webview.onDidReceiveMessage(
			async (message) => {
				if (message.command === "highlightLines" && currentEditor) {
					const startLine = message.startLine - 1;
					const endLine = message.endLine - 1;
					const selection = new vscode.Selection(
						new vscode.Position(startLine, 0),
						new vscode.Position(
							endLine,
							currentEditor.document.lineAt(endLine).text.length,
						),
					);
					currentEditor.selection = selection;
					currentEditor.revealRange(
						selection,
						vscode.TextEditorRevealType.InCenter,
					);
				}
			},
			null,
			context.subscriptions,
		);
	}

	private updateContent(fileName: string, documentation: Documentation): void {
		if (!this.panel) return;
		this.panel.webview.html = generateWebviewHTML(
			fileName,
			documentation,
			this.renderMarkdown,
		);
	}

	private renderMarkdown(text: string): string {
		return `<div class="markdown-content" data-markdown="true">${text}</div>`;
	}

	private setupSelectionListener(
		context: vscode.ExtensionContext,
		currentEditor?: vscode.TextEditor,
	): void {
		if (this.selectionListener) {
			this.selectionListener.dispose();
		}

		this.selectionListener = vscode.window.onDidChangeTextEditorSelection(
			(e) => {
				if (e.textEditor === currentEditor && this.panel) {
					const currentLine = e.selections[0].active.line + 1;
					this.panel.webview.postMessage({
						command: "highlightProse",
						line: currentLine,
					});
				}
			},
		);

		context.subscriptions.push(this.selectionListener);
	}

	public dispose(): void {
		if (this.panel) {
			this.panel.dispose();
		}
		if (this.selectionListener) {
			this.selectionListener.dispose();
		}
	}
}
