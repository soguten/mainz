import { readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { denoToolingRuntime } from "../../tooling/runtime/deno.ts";
import type { MainzToolingRuntime } from "../../tooling/runtime/types.ts";
import {
  builtInTemplateManifest,
  type BuiltInTemplateKey,
} from "./built-in-template-manifest.ts";

export interface LoadedTemplate {
  manifest: Record<string, unknown>;
  manifestSource: string;
  root: string;
  filesRoot: string;
  filePaths?: readonly string[];
  files?: LoadedRemoteTemplateFile[];
}

export interface LoadedRemoteTemplateFile {
  path: string;
  content: string;
}

export interface LoadedRemoteTemplate {
  manifest: Record<string, unknown>;
  manifestSource: string;
  root: string;
  filesRoot: string;
  filePaths?: readonly string[];
  files: LoadedRemoteTemplateFile[];
}

const tarBlockSize = 512;
const templatesRootDir = resolveBuiltInTemplatesRootFromModuleUrl(import.meta.url);

export function resolveBuiltInTemplateRoot(kind: string, name: string): string {
  return joinTemplateRoot(joinTemplateRoot(templatesRootDir, kind), name);
}

export function joinTemplateRoot(root: string, child: string): string {
  if (isRemoteTemplateRoot(root)) {
    return new URL(resolveUrlPathSegment(child), ensureTrailingSlash(root)).href;
  }

  return resolve(root, child);
}

export function builtInTemplateExists(templateRoot: string): boolean {
  const builtInKey = resolveBuiltInTemplateKey(templateRoot);
  if (builtInKey) {
    return builtInKey in builtInTemplateManifest;
  }

  try {
    const manifestPath = resolve(templateRoot, "template.json");
    const stat = statSync(manifestPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export function listBuiltInTemplateNames(templateRoot: string): string[] {
  const builtInPrefix = resolveBuiltInTemplateKey(templateRoot);
  if (builtInPrefix !== undefined) {
    return listBuiltInTemplateManifestNames(builtInPrefix);
  }

  try {
    const names: string[] = [];
    for (const entry of readdirSync(templateRoot, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        directoryContainsTemplateManifest(resolve(templateRoot, entry.name))
      ) {
        names.push(entry.name);
      }
    }

    return names.sort();
  } catch {
    return [];
  }
}

function directoryContainsTemplateManifest(root: string): boolean {
  if (builtInTemplateExists(root)) {
    return true;
  }

  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (directoryContainsTemplateManifest(resolve(root, entry.name))) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

export async function loadTemplate(
  templateRoot: string,
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<LoadedTemplate> {
  const manifestPath = joinTemplateRoot(templateRoot, "template.json");
  const manifestSource = await readTemplateTextFile(manifestPath, runtime);
  const manifest = JSON.parse(manifestSource) as Record<string, unknown>;

  if (!manifest.kind || !manifest.name) {
    throw new Error(`Invalid template manifest at "${manifestPath}".`);
  }

  const builtInKey = resolveBuiltInTemplateKey(templateRoot);
  const builtInFiles = builtInKey
    ? builtInTemplateManifest[builtInKey]
    : undefined;

  if (builtInFiles && isRemoteTemplateRoot(templateRoot)) {
    const files = await Promise.all(
      builtInFiles.map(async (path) => ({
        path,
        content: await readTemplateTextFile(
          joinTemplateRoot(joinTemplateRoot(templateRoot, "files"), path),
          runtime,
        ),
      })),
    );

    return {
      manifest,
      manifestSource,
      root: templateRoot,
      filesRoot: joinTemplateRoot(templateRoot, "files"),
      filePaths: builtInFiles,
      files,
    };
  }

  return {
    manifest,
    manifestSource,
    root: templateRoot,
    filesRoot: joinTemplateRoot(templateRoot, "files"),
    filePaths: builtInFiles,
  };
}

export async function loadRemoteTemplate(
  templateSourceUrl: string,
): Promise<LoadedRemoteTemplate> {
  const archiveUrl = resolveRemoteTemplateArchiveUrl(templateSourceUrl);
  const archiveEntries = parseTarArchive(
    await ungzip(await fetchRemoteTemplateBytes(archiveUrl)),
    archiveUrl.href,
  );
  const manifestEntry = resolveRemoteTemplateManifestEntry(
    archiveEntries,
    archiveUrl.href,
  );
  const manifestSource = manifestEntry.content;
  const manifest = JSON.parse(manifestSource) as Record<string, unknown>;

  if (!manifest.kind || !manifest.name) {
    throw new Error(
      `Invalid remote template source manifest in "${archiveUrl.href}".`,
    );
  }

  const templateRoot = dirname(manifestEntry.path).replaceAll("\\", "/");
  const filesRoot = templateRoot === "." ? "files/" : `${templateRoot}/files/`;
  const files = archiveEntries
    .filter((entry) =>
      entry.path.startsWith(filesRoot) && entry.path !== filesRoot
    )
    .map((entry) => ({
      path: entry.path.slice(filesRoot.length),
      content: entry.content,
    }))
    .filter((file) => file.path.length > 0);

  return {
    manifest,
    manifestSource,
    root: archiveUrl.href,
    filesRoot,
    filePaths: files.map((file) => file.path),
    files,
  };
}

function resolveRemoteTemplateArchiveUrl(templateSourceUrl: string): URL {
  const url = new URL(templateSourceUrl);
  if (url.pathname.endsWith(".tar.gz") || url.pathname.endsWith(".tgz")) {
    return url;
  }

  throw new Error(
    `Remote template source "${templateSourceUrl}" must point to a .tar.gz or .tgz archive.`,
  );
}

async function fetchRemoteTemplateBytes(url: URL): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not fetch remote template source archive "${url.href}": ${response.status} ${response.statusText}.`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function ungzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseTarArchive(
  bytes: Uint8Array,
  source: string,
): LoadedRemoteTemplateFile[] {
  const entries: LoadedRemoteTemplateFile[] = [];
  let offset = 0;

  while (offset + tarBlockSize <= bytes.length) {
    const header = bytes.subarray(offset, offset + tarBlockSize);
    if (header.every((value) => value === 0)) {
      break;
    }

    const path = normalizeRemoteTemplateFilePath(readTarString(header, 0, 100));
    const prefix = readTarString(header, 345, 155);
    const fullPath = prefix
      ? normalizeRemoteTemplateFilePath(`${prefix}/${path}`)
      : path;
    const typeFlag = readTarString(header, 156, 1);
    const size = readTarOctal(header, 124, 12);
    const contentOffset = offset + tarBlockSize;
    const nextOffset = contentOffset +
      Math.ceil(size / tarBlockSize) * tarBlockSize;

    if (nextOffset > bytes.length) {
      throw new Error(
        `Remote template archive "${source}" has a truncated tar entry.`,
      );
    }

    if (typeFlag === "" || typeFlag === "0") {
      entries.push({
        path: fullPath,
        content: textDecode(
          bytes.subarray(contentOffset, contentOffset + size),
        ),
      });
    }

    offset = nextOffset;
  }

  return entries;
}

function resolveRemoteTemplateManifestEntry(
  entries: LoadedRemoteTemplateFile[],
  source: string,
): LoadedRemoteTemplateFile {
  const manifests = entries.filter((entry) =>
    entry.path.endsWith("/template.json") ||
    entry.path === "template.json"
  );
  if (manifests.length === 0) {
    throw new Error(
      `Remote template archive "${source}" must contain a template.json file.`,
    );
  }

  const manifestWithFiles = manifests.find((entry) => {
    const templateRoot = dirname(entry.path).replaceAll("\\", "/");
    const filesRoot = templateRoot === "."
      ? "files/"
      : `${templateRoot}/files/`;
    return entries.some((candidate) => candidate.path.startsWith(filesRoot));
  });

  return manifestWithFiles ?? manifests[0]!;
}

function normalizeRemoteTemplateFilePath(filePath: unknown): string {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error(
      "Remote template source file paths must be non-empty strings.",
    );
  }

  const normalized = filePath.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    normalized.includes("://") ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Invalid remote template source file path "${filePath}".`);
  }

  return normalized;
}

function readTarString(
  bytes: Uint8Array,
  offset: number,
  length: number,
): string {
  const slice = bytes.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return textDecode(end >= 0 ? slice.subarray(0, end) : slice).trim();
}

function readTarOctal(
  bytes: Uint8Array,
  offset: number,
  length: number,
): number {
  const value = readTarString(bytes, offset, length).replace(/\0/g, "").trim();
  return value ? Number.parseInt(value, 8) : 0;
}

function textDecode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export function resolveBuiltInTemplatesRootFromModuleUrl(
  moduleUrl: string,
): string {
  const url = new URL(moduleUrl);
  if (url.protocol === "file:") {
    return resolve(
      dirname(fileURLToPath(url)),
      "..",
      "..",
      "..",
      "templates",
    );
  }

  return new URL("../../../templates/", url).href;
}

function resolveBuiltInTemplateKey(
  templateRoot: string,
): BuiltInTemplateKey | "" | undefined {
  const normalizedSegments = getTemplateSegments(templateRoot);
  const templatesIndex = normalizedSegments.lastIndexOf("templates");
  if (templatesIndex < 0) {
    return undefined;
  }

  const relativeSegments = normalizedSegments.slice(templatesIndex + 1);
  const relativeKey = relativeSegments.join("/");
  if (!relativeKey) {
    return "";
  }

  return relativeKey as BuiltInTemplateKey;
}

function listBuiltInTemplateManifestNames(prefix: string): string[] {
  const nextNames = new Set<string>();
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const prefixWithSlash = normalizedPrefix ? `${normalizedPrefix}/` : "";

  for (const key of Object.keys(builtInTemplateManifest)) {
    if (!key.startsWith(prefixWithSlash)) {
      continue;
    }

    const remainder = key.slice(prefixWithSlash.length);
    if (!remainder) {
      continue;
    }

    const nextName = remainder.split("/", 1)[0];
    if (nextName) {
      nextNames.add(nextName);
    }
  }

  return [...nextNames].sort();
}

function getTemplateSegments(templateRoot: string): string[] {
  if (isRemoteTemplateRoot(templateRoot)) {
    return new URL(templateRoot).pathname.split("/").filter(Boolean);
  }

  if (isRemoteTemplateRoot(templatesRootDir)) {
    return [];
  }

  const relativeToTemplates = relative(templatesRootDir, templateRoot)
    .replaceAll("\\", "/")
    .replace(/^\.\/?/, "")
    .replace(/^\/+|\/+$/g, "");

  if (!relativeToTemplates || relativeToTemplates === ".") {
    return ["templates"];
  }

  return ["templates", ...relativeToTemplates.split("/").filter(Boolean)];
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isRemoteTemplateRoot(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveUrlPathSegment(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized === ".") {
    return "./";
  }

  return normalized.replace(/^\/+/, "");
}

async function readTemplateTextFile(
  pathOrUrl: string,
  runtime: MainzToolingRuntime,
): Promise<string> {
  if (isRemoteTemplateRoot(pathOrUrl)) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(
        `Could not fetch built-in template file "${pathOrUrl}": ${response.status} ${response.statusText}.`,
      );
    }

    return await response.text();
  }

  try {
    const url = new URL(pathOrUrl);
    if (url.protocol === "file:") {
      return await runtime.readTextFile(fileURLToPath(url));
    }
  } catch {
    // Not a URL, treat as a normal filesystem path.
  }

  return await runtime.readTextFile(pathOrUrl);
}
