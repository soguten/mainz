import { dirname, resolve } from "node:path";
import { denoToolingRuntime } from "../../tooling/runtime/deno.ts";
import type { MainzToolingRuntime } from "../../tooling/runtime/types.ts";
import { resolveBuiltInTemplateBundle } from "./built-in-templates.generated.ts";

export interface LoadedTemplate {
    manifest: Record<string, unknown>;
    manifestSource: string;
    root: string;
    filesRoot: string;
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
    files: LoadedRemoteTemplateFile[];
}

const tarBlockSize = 512;

export function resolveBuiltInTemplateRoot(kind: string, name: string): string {
    return `builtin:${kind}/${name}`.replaceAll("\\", "/");
}

export async function loadTemplate(
    templateRoot: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<LoadedTemplate> {
    if (isBuiltInTemplateRoot(templateRoot)) {
        return loadBuiltInTemplate(templateRoot);
    }

    const manifestPath = resolve(templateRoot, "template.json");
    const manifestSource = await runtime.readTextFile(manifestPath);
    const manifest = JSON.parse(manifestSource) as Record<string, unknown>;

    if (!manifest.kind || !manifest.name) {
        throw new Error(`Invalid template manifest at "${manifestPath}".`);
    }

    return {
        manifest,
        manifestSource,
        root: templateRoot,
        filesRoot: resolve(templateRoot, "files"),
    };
}

function loadBuiltInTemplate(templateRoot: string): LoadedTemplate {
    const key = templateRoot.slice("builtin:".length).replace(/^\/+/, "").replace(/\/+$/, "");
    const [kind, ...nameParts] = key.split("/");
    const name = nameParts.join("/");
    const bundle = resolveBuiltInTemplateBundle(kind ?? "", name);
    if (!bundle) {
        throw new Error(`Built-in template "${key}" was not found.`);
    }

    const manifestSource = bundle.manifestSource;
    const manifest = JSON.parse(manifestSource) as Record<string, unknown>;

    return {
        manifest,
        manifestSource,
        root: templateRoot,
        filesRoot: `${templateRoot}/files`,
        files: bundle.files.map((file) => ({ ...file })),
    };
}

export async function loadRemoteTemplate(templateSourceUrl: string): Promise<LoadedRemoteTemplate> {
    const archiveUrl = resolveRemoteTemplateArchiveUrl(templateSourceUrl);
    const archiveEntries = parseTarArchive(
        await ungzip(await fetchRemoteTemplateBytes(archiveUrl)),
        archiveUrl.href,
    );
    const manifestEntry = resolveRemoteTemplateManifestEntry(archiveEntries, archiveUrl.href);
    const manifestSource = manifestEntry.content;
    const manifest = JSON.parse(manifestSource) as Record<string, unknown>;

    if (!manifest.kind || !manifest.name) {
        throw new Error(`Invalid remote template source manifest in "${archiveUrl.href}".`);
    }

    const templateRoot = dirname(manifestEntry.path).replaceAll("\\", "/");
    const filesRoot = templateRoot === "." ? "files/" : `${templateRoot}/files/`;
    const files = archiveEntries
        .filter((entry) => entry.path.startsWith(filesRoot) && entry.path !== filesRoot)
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

function isBuiltInTemplateRoot(templateRoot: string): boolean {
    return templateRoot.startsWith("builtin:");
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

function parseTarArchive(bytes: Uint8Array, source: string): LoadedRemoteTemplateFile[] {
    const entries: LoadedRemoteTemplateFile[] = [];
    let offset = 0;

    while (offset + tarBlockSize <= bytes.length) {
        const header = bytes.subarray(offset, offset + tarBlockSize);
        if (header.every((value) => value === 0)) {
            break;
        }

        const path = normalizeRemoteTemplateFilePath(readTarString(header, 0, 100));
        const prefix = readTarString(header, 345, 155);
        const fullPath = prefix ? normalizeRemoteTemplateFilePath(`${prefix}/${path}`) : path;
        const typeFlag = readTarString(header, 156, 1);
        const size = readTarOctal(header, 124, 12);
        const contentOffset = offset + tarBlockSize;
        const nextOffset = contentOffset + Math.ceil(size / tarBlockSize) * tarBlockSize;

        if (nextOffset > bytes.length) {
            throw new Error(`Remote template archive "${source}" has a truncated tar entry.`);
        }

        if (typeFlag === "" || typeFlag === "0") {
            entries.push({
                path: fullPath,
                content: textDecode(bytes.subarray(contentOffset, contentOffset + size)),
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
        const filesRoot = templateRoot === "." ? "files/" : `${templateRoot}/files/`;
        return entries.some((candidate) => candidate.path.startsWith(filesRoot));
    });

    return manifestWithFiles ?? manifests[0]!;
}

function normalizeRemoteTemplateFilePath(filePath: unknown): string {
    if (typeof filePath !== "string" || !filePath.trim()) {
        throw new Error("Remote template source file paths must be non-empty strings.");
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

function readTarString(bytes: Uint8Array, offset: number, length: number): string {
    const slice = bytes.subarray(offset, offset + length);
    const end = slice.indexOf(0);
    return textDecode(end >= 0 ? slice.subarray(0, end) : slice).trim();
}

function readTarOctal(bytes: Uint8Array, offset: number, length: number): number {
    const value = readTarString(bytes, offset, length).replace(/\0/g, "").trim();
    return value ? Number.parseInt(value, 8) : 0;
}

function textDecode(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
