import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rolldown";
import { minify } from "rollup-plugin-esbuild";
import { importAsString } from "rollup-plugin-string-import";

export default defineConfig({
	input: "src-public/extension.ts",
	output: {
		dir: "out",
		format: "cjs",
		sourcemap: process.env.NODE_ENV === "development",
	},
	external: ["vscode"],
	platform: "node",
	plugins: [
		importAsString({
			include: ["prompts/**/*.md"],
		}),
		minify(),
		typescript({
			sourceMap: process.env.NODE_ENV === "development",
		}),
	],
});
