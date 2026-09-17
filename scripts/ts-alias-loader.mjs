// @ts-nocheck
/**
 * Custom Node ESM loader that resolves:
 *   1. `@/lib/…` path aliases → `<projectRoot>/src/lib/…`
 *   2. Extension-less `.ts` imports — including compound names like `foo.server`
 *      that look like they have an extension but actually need `.ts` appended.
 *
 * Usage:
 *   node --loader ./scripts/ts-alias-loader.mjs --experimental-strip-types …
 */

import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const projectRoot = pathResolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Try to find an existing file by appending .ts / .tsx / /index.ts */
function tryResolveTs(abs) {
  if (existsSync(abs)) return abs;
  if (existsSync(abs + ".ts")) return abs + ".ts";
  if (existsSync(abs + ".tsx")) return abs + ".tsx";
  if (existsSync(abs + "/index.ts")) return abs + "/index.ts";
  if (existsSync(abs + "/index.tsx")) return abs + "/index.tsx";
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // 1. Rewrite `@/lib/…` → absolute file URL into `src/lib/…`
  if (specifier.startsWith("@/")) {
    const rewritten = specifier.replace(/^@\//, "src/");
    const abs = pathResolve(projectRoot, rewritten);
    const resolved = tryResolveTs(abs);
    if (resolved) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }

  // 2. Relative imports — resolve extension-less .ts files
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : projectRoot;

    const abs = pathResolve(parentDir, specifier);
    const resolved = tryResolveTs(abs);
    if (resolved && resolved !== abs) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }

  return nextResolve(specifier, context);
}

