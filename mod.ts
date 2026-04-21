/**
 * Minimal Mainz JSR probe package.
 *
 * This entrypoint intentionally exports a tiny utility surface so we can
 * validate publication behavior independently from the full framework graph.
 *
 * @module
 */

export { normalizeLocaleTag, toLocalePathSegment } from "./src/utils/locale.ts";
