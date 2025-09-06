import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Documentation, SkillLevel } from "./types";

export class CacheManager {
	private readonly cacheDir: string;

	constructor() {
		this.cacheDir = path.join(
			process.env.HOME || process.env.USERPROFILE || "",
			".cache/mathematic-literate",
		);
		this.ensureCacheDir();
	}

	private ensureCacheDir(): void {
		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir, { recursive: true });
		}
	}

	private getCacheKey(
		filePath: string,
		content: string,
		skillLevel: SkillLevel,
	): string {
		const hash = crypto.createHash("sha256");
		hash.update(filePath);
		hash.update(content);
		hash.update(skillLevel);
		return hash.digest("hex");
	}

	private getCachePath(cacheKey: string): string {
		return path.join(this.cacheDir, `${cacheKey}.json`);
	}

	public load(
		filePath: string,
		content: string,
		skillLevel: SkillLevel,
	): Documentation | null {
		const cacheKey = this.getCacheKey(filePath, content, skillLevel);
		const cachePath = this.getCachePath(cacheKey);
		try {
			if (fs.existsSync(cachePath)) {
				const data = fs.readFileSync(cachePath, "utf-8");
				return JSON.parse(data) as Documentation;
			}
		} catch (error) {
			console.error("Error loading cache:", error);
		}
		return null;
	}

	public save(
		filePath: string,
		content: string,
		skillLevel: SkillLevel,
		documentation: Documentation,
	): void {
		const cacheKey = this.getCacheKey(filePath, content, skillLevel);
		const cachePath = this.getCachePath(cacheKey);
		try {
			fs.writeFileSync(cachePath, JSON.stringify(documentation, null, 2));
		} catch (error) {
			console.error("Error saving cache:", error);
		}
	}

	public exists(
		filePath: string,
		content: string,
		skillLevel: SkillLevel,
	): boolean {
		const cacheKey = this.getCacheKey(filePath, content, skillLevel);
		const cachePath = this.getCachePath(cacheKey);
		return fs.existsSync(cachePath);
	}
}
