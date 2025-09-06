import type { Documentation } from "./types";

export function generateWebviewHTML(
	fileName: string,
	documentation: Documentation,
	renderMarkdown: (text: string) => string,
): string {
	const contentHtml = generateContentHTML(documentation, renderMarkdown);
	return generateFullHTML(fileName, contentHtml);
}

function generateContentHTML(
	documentation: Documentation,
	renderMarkdown: (text: string) => string,
): string {
	if (documentation.sections.length === 0) {
		return `
			<div class="empty-state">
				<div class="empty-state-message">
					No documentation generated
				</div>
				<div class="empty-state-hint">
					The AI was unable to generate documentation for this file.
				</div>
			</div>
		`;
	}

	let contentHtml = "";
	for (let index = 0; index < documentation.sections.length; index++) {
		const section = documentation.sections[index];
		const lineRanges = section.lines
			.map((r) => `${r.start}-${r.end}`)
			.join(",");

		contentHtml += `
			<div class="prose-block" data-lines="${lineRanges}" data-index="${index}">
				<div class="line-indicator">
					Lines: ${section.lines.map((r) => (r.start === r.end ? r.start : `${r.start}-${r.end}`)).join(", ")}
				</div>
				<div class="prose-documentation">
					${renderMarkdown(section.text)}
				</div>
			</div>
		`;
	}
	return contentHtml;
}

function generateFullHTML(fileName: string, contentHtml: string): string {
	return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Literate - ${fileName}</title>
			<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
			<style>
				${getStyles()}
			</style>
		</head>
		<body>
			<h1>📖 ${fileName.split("/").pop()}</h1>
			<div class="content">
				${contentHtml}
			</div>
			<script>
				${getScript()}
			</script>
		</body>
		</html>`;
}

function getStyles(): string {
	return `
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
	`;
}

function getScript(): string {
	return `
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
	`;
}
