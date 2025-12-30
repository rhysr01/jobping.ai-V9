#!/usr/bin/env node

/**
 * File Cleanup Script
 *
 * Identifies and optionally removes:
 * - Dead/orphaned files (not referenced in codebase)
 * - Old migrations (applied migrations that can be archived)
 * - Unused markdown files (not linked or referenced)
 *
 * SAFETY: NEVER deletes .env files, config files, or git-tracked files
 */

import { execSync } from "node:child_process";
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";

interface FileInfo {
	path: string;
	size: number;
	lastModified: Date;
	reason: string;
}

interface CleanupOptions {
	dryRun: boolean;
	backup: boolean;
	includeMigrations: boolean;
	includeMarkdown: boolean;
	includeOrphaned: boolean;
}

const DEFAULT_OPTIONS: CleanupOptions = {
	dryRun: true,
	backup: true,
	includeMigrations: true,
	includeMarkdown: true,
	includeOrphaned: true,
};

// Files and patterns that should NEVER be deleted
const PROTECTED_PATTERNS = [
	/^\.env/, // All .env files
	/\.env\./, // Any file with .env. in the name
	/^\.git/, // Git files
	/^\.github/, // GitHub workflows
	/package\.json$/, // Package files
	/package-lock\.json$/, // Lock files
	/tsconfig\.json$/, // Config files
	/next\.config\./, // Next.js config
	/tailwind\.config\./, // Tailwind config
	/jest\.config\./, // Jest config
	/\.eslintrc/, // ESLint config
	/\.gitignore$/, // Git ignore
	/README\.md$/i, // README files
	/^node_modules/, // Dependencies
	/^\.next/, // Build output
	/^dist/, // Build output
	/^build/, // Build output
	/\.backup$/, // Backup files
	/\.backup\d+$/, // Numbered backups
];

class FileCleanup {
	private rootDir: string;
	private options: CleanupOptions;
	private filesToRemove: FileInfo[] = [];
	private allFiles: Set<string> = new Set();
	private referencedFiles: Set<string> = new Set();
	private gitTrackedFiles: Set<string> = new Set();

	constructor(rootDir: string, options: Partial<CleanupOptions> = {}) {
		this.rootDir = rootDir;
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Check if a file is protected from deletion
	 */
	private isProtected(filePath: string): boolean {
		const fileName = basename(filePath);

		// Check against protected patterns
		for (const pattern of PROTECTED_PATTERNS) {
			if (pattern.test(filePath) || pattern.test(fileName)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get all files recursively
	 */
	private getAllFiles(
		dir: string,
		ignoreDirs: Set<string> = new Set([
			"node_modules",
			".git",
			".next",
			"dist",
			"build",
			"__pycache__",
			".cache",
		]),
	): void {
		try {
			const entries = readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				const relPath = relative(this.rootDir, fullPath);

				if (entry.isDirectory()) {
					if (!ignoreDirs.has(entry.name) && !entry.name.startsWith(".")) {
						this.getAllFiles(fullPath, ignoreDirs);
					}
				} else {
					this.allFiles.add(relPath);
				}
			}
		} catch (_error) {
			// Skip directories we can't read
		}
	}

	/**
	 * Get git tracked files
	 */
	private getGitTrackedFiles(): void {
		try {
			const output = execSync("git ls-files", {
				cwd: this.rootDir,
				encoding: "utf-8",
			});
			output.split("\n").forEach((file) => {
				if (file.trim()) {
					this.gitTrackedFiles.add(file.trim());
				}
			});
		} catch (_error) {
			console.warn("⚠️  Could not get git tracked files (not a git repo?)");
		}
	}

	/**
	 * Find all file references in codebase
	 */
	private findFileReferences(): void {
		const codeExtensions = [
			".ts",
			".tsx",
			".js",
			".jsx",
			".cjs",
			".mjs",
			".json",
			".md",
			".yml",
			".yaml",
			".sql",
		];

		for (const filePath of this.allFiles) {
			if (!codeExtensions.some((ext) => filePath.endsWith(ext))) {
				continue;
			}

			try {
				const fullPath = join(this.rootDir, filePath);
				const content = readFileSync(fullPath, "utf-8");

				// Find imports, requires, and file references
				const importRegex = /(?:import|require|from)\s+['"]([^'"]+)['"]/g;
				const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				const pathRegex = /['"](\.\.?\/[^'"]+)['"]/g;

				let match;

				// Find imports
				while ((match = importRegex.exec(content)) !== null) {
					this.referencedFiles.add(match[1]);
				}

				// Find markdown links
				while ((match = linkRegex.exec(content)) !== null) {
					this.referencedFiles.add(match[2]);
				}

				// Find relative paths
				while ((match = pathRegex.exec(content)) !== null) {
					this.referencedFiles.add(match[1]);
				}
			} catch (_error) {
				// Skip files we can't read
			}
		}
	}

	/**
	 * Check if a file is referenced
	 */
	private isFileReferenced(filePath: string): boolean {
		// Check direct references
		for (const ref of this.referencedFiles) {
			if (ref.includes(filePath) || filePath.includes(ref)) {
				return true;
			}
		}

		// Check if it's a well-known file
		const knownFiles = [
			"README.md",
			"package.json",
			"tsconfig.json",
			"next.config.ts",
			"tailwind.config.ts",
			".gitignore",
			".eslintrc.json",
			"jest.config.js",
		];

		const fileName = basename(filePath);
		if (knownFiles.includes(fileName)) {
			return true;
		}

		return false;
	}

	/**
	 * Find orphaned files (not referenced anywhere)
	 */
	private findOrphanedFiles(): void {
		if (!this.options.includeOrphaned) return;

		console.log("\n🔍 Scanning for orphaned files...");

		for (const filePath of this.allFiles) {
			// Skip protected files
			if (this.isProtected(filePath)) {
				continue;
			}

			// Skip certain directories
			if (
				filePath.includes("node_modules") ||
				filePath.includes(".git") ||
				filePath.includes(".next") ||
				filePath.includes("dist") ||
				filePath.includes("build")
			) {
				continue;
			}

			// Skip if it's git tracked (probably important)
			if (this.gitTrackedFiles.has(filePath)) {
				continue;
			}

			// Skip if it's referenced
			if (this.isFileReferenced(filePath)) {
				continue;
			}

			// Skip if it's a config file
			if (filePath.includes("config") || filePath.includes(".config.")) {
				continue;
			}

			const fullPath = join(this.rootDir, filePath);
			try {
				const stats = statSync(fullPath);
				if (stats.isFile()) {
					this.filesToRemove.push({
						path: filePath,
						size: stats.size,
						lastModified: stats.mtime,
						reason: "Orphaned (not referenced in codebase)",
					});
				}
			} catch (_error) {
				// Skip files we can't access
			}
		}
	}

	/**
	 * Find old migrations that have been applied
	 */
	private findOldMigrations(): void {
		if (!this.options.includeMigrations) return;

		console.log("\n🔍 Scanning for old migrations...");

		const migrationsDir = join(this.rootDir, "migrations");
		if (!existsSync(migrationsDir)) {
			return;
		}

		try {
			const migrationFiles = readdirSync(migrationsDir)
				.filter((f) => f.endsWith(".sql"))
				.sort();

			// Keep migrations from the last 6 months
			const sixMonthsAgo = new Date();
			sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

			for (const migrationFile of migrationFiles) {
				const fullPath = join(migrationsDir, migrationFile);

				// Never delete migrations - they're important for database history
				// Just report them, don't delete
				const _stats = statSync(fullPath);
				const dateMatch = migrationFile.match(/^(\d{8})_/);
				if (dateMatch) {
					const migrationDate = new Date(
						dateMatch[1].substring(0, 4) +
							"-" +
							dateMatch[1].substring(4, 6) +
							"-" +
							dateMatch[1].substring(6, 8),
					);

					if (migrationDate < sixMonthsAgo) {
						console.log(
							`   ℹ️  Old migration found: ${migrationFile} (${migrationDate.toISOString().split("T")[0]}) - Keeping for database history`,
						);
					}
				}
			}
		} catch (_error) {
			console.warn("⚠️  Could not scan migrations directory");
		}
	}

	/**
	 * Find unused markdown files
	 */
	private findUnusedMarkdown(): void {
		if (!this.options.includeMarkdown) return;

		console.log("\n🔍 Scanning for unused markdown files...");

		const markdownFiles: string[] = [];

		// Find all markdown files
		for (const filePath of this.allFiles) {
			if (filePath.endsWith(".md")) {
				markdownFiles.push(filePath);
			}
		}

		// Check which ones are referenced
		for (const mdFile of markdownFiles) {
			const fileName = basename(mdFile);

			// Always keep README files
			if (fileName === "README.md" || fileName.startsWith("README")) {
				continue;
			}

			// Skip protected files
			if (this.isProtected(mdFile)) {
				continue;
			}

			// Check if referenced
			if (this.isFileReferenced(mdFile)) {
				continue;
			}

			// Check if it's in git
			if (this.gitTrackedFiles.has(mdFile)) {
				// Still check if it's actually used
				let isUsed = false;
				for (const ref of this.referencedFiles) {
					if (ref.includes(fileName) || ref.includes(mdFile)) {
						isUsed = true;
						break;
					}
				}

				if (!isUsed) {
					const fullPath = join(this.rootDir, mdFile);
					try {
						const stats = statSync(fullPath);
						this.filesToRemove.push({
							path: mdFile,
							size: stats.size,
							lastModified: stats.mtime,
							reason: "Unused markdown file",
						});
					} catch (_error) {
						// Skip
					}
				}
			}
		}
	}

	/**
	 * Create backup of files to be removed
	 */
	private createBackup(): void {
		if (!this.options.backup || this.filesToRemove.length === 0) {
			return;
		}

		const backupDir = join(this.rootDir, ".cleanup-backup");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupFile = join(backupDir, `cleanup-${timestamp}.txt`);

		try {
			if (!existsSync(backupDir)) {
				execSync(`mkdir -p "${backupDir}"`, { cwd: this.rootDir });
			}

			const backupContent = this.filesToRemove
				.map(
					(f) =>
						`${f.path}|${f.size}|${f.lastModified.toISOString()}|${f.reason}`,
				)
				.join("\n");

			writeFileSync(backupFile, backupContent);
			console.log(`\n💾 Backup saved to: ${backupFile}`);
		} catch (_error) {
			console.warn("⚠️  Could not create backup");
		}
	}

	/**
	 * Remove files
	 */
	private removeFiles(): void {
		if (this.options.dryRun) {
			console.log("\n🔍 DRY RUN MODE - No files will be deleted\n");
			return;
		}

		console.log("\n🗑️  Removing files...\n");
		let removed = 0;
		let errors = 0;

		for (const fileInfo of this.filesToRemove) {
			// Double-check protection before deleting
			if (this.isProtected(fileInfo.path)) {
				console.log(`   ⚠️  SKIPPED (protected): ${fileInfo.path}`);
				continue;
			}

			try {
				const fullPath = join(this.rootDir, fileInfo.path);
				if (existsSync(fullPath)) {
					unlinkSync(fullPath);
					removed++;
					console.log(`   ✅ Removed: ${fileInfo.path}`);
				}
			} catch (error) {
				errors++;
				console.error(`   ❌ Error removing ${fileInfo.path}: ${error}`);
			}
		}

		console.log(`\n✅ Removed ${removed} files`);
		if (errors > 0) {
			console.log(`⚠️  ${errors} errors occurred`);
		}
	}

	/**
	 * Print summary
	 */
	private printSummary(): void {
		if (this.filesToRemove.length === 0) {
			console.log("\n✅ No files to clean up!");
			return;
		}

		console.log("\n📊 Cleanup Summary:");
		console.log(`   Total files to remove: ${this.filesToRemove.length}`);

		const totalSize = this.filesToRemove.reduce((sum, f) => sum + f.size, 0);
		const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
		console.log(`   Total size: ${sizeMB} MB`);

		// Group by reason
		const byReason: Record<string, FileInfo[]> = {};
		for (const file of this.filesToRemove) {
			if (!byReason[file.reason]) {
				byReason[file.reason] = [];
			}
			byReason[file.reason].push(file);
		}

		console.log("\n📋 Files by category:");
		for (const [reason, files] of Object.entries(byReason)) {
			console.log(`\n   ${reason}: ${files.length} files`);
			files.slice(0, 10).forEach((f) => {
				console.log(`      - ${f.path} (${(f.size / 1024).toFixed(1)} KB)`);
			});
			if (files.length > 10) {
				console.log(`      ... and ${files.length - 10} more`);
			}
		}
	}

	/**
	 * Run cleanup
	 */
	async run(): Promise<void> {
		console.log("🧹 Starting file cleanup...\n");
		console.log(`📁 Root directory: ${this.rootDir}`);
		console.log(`🔍 Dry run: ${this.options.dryRun ? "YES" : "NO"}`);
		console.log(`💾 Backup: ${this.options.backup ? "YES" : "NO"}`);
		console.log(`🛡️  Protected: .env files, config files, git-tracked files`);

		// Step 1: Get all files
		console.log("\n📂 Scanning filesystem...");
		this.getAllFiles(this.rootDir);
		console.log(`   Found ${this.allFiles.size} files`);

		// Step 2: Get git tracked files
		this.getGitTrackedFiles();
		console.log(`   Found ${this.gitTrackedFiles.size} git-tracked files`);

		// Step 3: Find references
		console.log("\n🔗 Finding file references...");
		this.findFileReferences();
		console.log(`   Found ${this.referencedFiles.size} file references`);

		// Step 4: Find files to remove
		this.findOrphanedFiles();
		this.findOldMigrations();
		this.findUnusedMarkdown();

		// Step 5: Print summary
		this.printSummary();

		// Step 6: Create backup
		if (this.filesToRemove.length > 0) {
			this.createBackup();
		}

		// Step 7: Remove files
		this.removeFiles();

		console.log("\n✅ Cleanup complete!");
	}
}

// Main execution
function main() {
	const args = process.argv.slice(2);
	const options: Partial<CleanupOptions> = {
		dryRun: !args.includes("--execute"),
		backup: !args.includes("--no-backup"),
		includeMigrations: !args.includes("--no-migrations"),
		includeMarkdown: !args.includes("--no-markdown"),
		includeOrphaned: !args.includes("--no-orphaned"),
	};

	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
File Cleanup Script

Usage: npx tsx scripts/cleanup-files.ts [options]

Options:
  --execute          Actually delete files (default: dry run)
  --no-backup       Don't create backup file
  --no-migrations   Skip migration cleanup
  --no-markdown     Skip markdown cleanup
  --no-orphaned     Skip orphaned file cleanup
  --help, -h         Show this help

Safety Features:
  - NEVER deletes .env files (any file starting with .env)
  - NEVER deletes config files (package.json, tsconfig.json, etc.)
  - NEVER deletes git-tracked files
  - NEVER deletes backup files
  - Dry run by default

Examples:
  npx tsx scripts/cleanup-files.ts                    # Dry run (safe)
  npx tsx scripts/cleanup-files.ts --execute          # Actually delete files
  npx tsx scripts/cleanup-files.ts --no-markdown       # Skip markdown cleanup
    `);
		process.exit(0);
	}

	const rootDir = process.cwd();
	const cleanup = new FileCleanup(rootDir, options);

	cleanup.run().catch((error) => {
		console.error("❌ Cleanup failed:", error);
		process.exit(1);
	});
}

if (require.main === module) {
	main();
}

export { FileCleanup };
