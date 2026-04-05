export interface DocsServiceOptions {
    rootPath?: string;
}

export interface DocsArticleMeta {
    slug: string;
    title: string;
    summary?: string;
    section: string;
    sectionTitle: string;
    sectionOrder: number;
    group?: string;
    groupTitle?: string;
    groupOrder?: number;
    order: number;
}

export interface DocsArticle extends DocsArticleMeta {
    markdown: string;
    sourcePath: string;
    frontmatter: Readonly<Record<string, string | number>>;
}

export interface DocsPageContent {
    id: string;
    title: string;
    summary: string;
    statusLabel?: string;
    pageTitle?: string;
    description?: string;
    markdown: string;
    sourcePath: string;
    frontmatter: Readonly<Record<string, string | number>>;
}

export interface DocsNavLeaf {
    slug: string;
    title: string;
}

export interface DocsNavSection {
    title: string;
    items: readonly DocsNavLeaf[];
    groups?: readonly {
        title: string;
        items: readonly DocsNavLeaf[];
    }[];
}

export interface DocsPagerLink {
    slug: string;
    title: string;
}

export interface DocsSourceFile {
    sourcePath: string;
    raw: string;
}

export interface DocsMetaFile {
    sourcePath: string;
    attributes: Record<string, unknown>;
}

export interface ParsedDocsFrontmatter {
    attributes: Record<string, string | number>;
    body: string;
}

export interface DocsCatalog {
    articles: readonly DocsArticle[];
    pagesById: ReadonlyMap<string, DocsPageContent>;
    articleBySlug: ReadonlyMap<string, DocsArticle>;
    navSections: readonly DocsNavSection[];
    pagerBySlug: ReadonlyMap<string, { previous?: DocsPagerLink; next?: DocsPagerLink }>;
    contentPathToSlug: ReadonlyMap<string, string>;
}

interface DocsNormalizedFile {
    kind: "article" | "page";
    sourcePath: string;
    markdown: string;
    frontmatter: Readonly<Record<string, string | number>>;
    slug?: string;
    id?: string;
    title: string;
    summary?: string;
    statusLabel?: string;
    pageTitle?: string;
    description?: string;
    section?: string;
    sectionTitle?: string;
    sectionOrder?: number;
    group?: string;
    groupTitle?: string;
    groupOrder?: number;
    order?: number;
}

interface DocsDirectoryMeta {
    attributes: Readonly<Record<string, string | number>>;
    articles?: ReadonlyMap<string, Readonly<Record<string, string | number>>>;
}

const DEFAULT_DOCS_ROOT = "../../../docs/";

const preloadedMarkdownModules = loadMarkdownModules();
const preloadedMetaModules = loadMetaModules();

export class DocsService {
    readonly #options: Required<DocsServiceOptions>;
    readonly #catalog: DocsCatalog;

    constructor(options: DocsServiceOptions = {}) {
        this.#options = {
            rootPath: normalizeRootPath(options.rootPath ?? DEFAULT_DOCS_ROOT),
        };
        this.#catalog = buildDocsCatalogFromFiles(
            discoverDocsFiles(this.#options.rootPath),
            discoverDocsMetaFiles(this.#options.rootPath),
        );
    }

    listSlugs(): readonly string[] {
        return this.#catalog.articles.map((article) => article.slug);
    }

    listArticles(): readonly DocsArticle[] {
        return this.#catalog.articles;
    }

    listNavSections(): readonly DocsNavSection[] {
        return this.#catalog.navSections;
    }

    getArticleMetaBySlug(slug: string): DocsArticleMeta | undefined {
        const article = this.#catalog.articleBySlug.get(slug);
        return article ? toArticleMeta(article) : undefined;
    }

    getArticleBySlug(slug: string): DocsArticle | undefined {
        return this.#catalog.articleBySlug.get(slug);
    }

    getFrontmatterBySlug(slug: string): Readonly<Record<string, string | number>> | undefined {
        return this.#catalog.articleBySlug.get(slug)?.frontmatter;
    }

    getMarkdownBySlug(slug: string): string | undefined {
        return this.#catalog.articleBySlug.get(slug)?.markdown;
    }

    getPageById(id: string): DocsPageContent | undefined {
        return this.#catalog.pagesById.get(id);
    }

    getPagerBySlug(slug?: string): { previous?: DocsPagerLink; next?: DocsPagerLink } {
        if (!slug) {
            const first = this.#catalog.articles[0];
            return {
                next: first ? { slug: first.slug, title: first.title } : undefined,
            };
        }

        return this.#catalog.pagerBySlug.get(slug) ?? {};
    }

    resolveMarkdownHref(currentSlug: string | undefined, href: string): string {
        return resolveDocsMarkdownHrefFromCatalog(this.#catalog, currentSlug, href);
    }
}

export function buildDocsCatalogFromFiles(
    files: readonly DocsSourceFile[],
    metaFiles: readonly DocsMetaFile[] = [],
): DocsCatalog {
    const directoryMetaByPath = buildDirectoryMetaByPath(metaFiles);
    const normalizedFiles = files
        .map((file) => normalizeDocsFile(file, directoryMetaByPath))
        .filter((file): file is DocsNormalizedFile => file !== null);

    const articles = normalizedFiles
        .filter((file): file is DocsNormalizedFile & { kind: "article" } => file.kind === "article")
        .map((file) => ({
            slug: file.slug!,
            title: file.title,
            summary: file.summary,
            section: file.section!,
            sectionTitle: file.sectionTitle!,
            sectionOrder: file.sectionOrder!,
            group: file.group,
            groupTitle: file.groupTitle,
            groupOrder: file.groupOrder,
            order: file.order!,
            markdown: file.markdown,
            sourcePath: file.sourcePath,
            frontmatter: file.frontmatter,
        }))
        .sort(compareDocsArticles);

    assertDeclaredDocsArticlesExist(normalizedFiles, directoryMetaByPath);

    const pages = normalizedFiles
        .filter((file): file is DocsNormalizedFile & { kind: "page" } => file.kind === "page")
        .map((file) => ({
            id: file.id!,
            title: file.title,
            summary: file.summary ?? "",
            statusLabel: file.statusLabel,
            pageTitle: file.pageTitle,
            description: file.description,
            markdown: file.markdown,
            sourcePath: file.sourcePath,
            frontmatter: file.frontmatter,
        }));

    const articleBySlug = new Map<string, DocsArticle>();
    const pagesById = new Map<string, DocsPageContent>();
    const contentPathToSlug = new Map<string, string>();
    const sectionMetadataByKey = new Map<string, { sectionTitle: string; sectionOrder: number }>();
    const groupMetadataByKey = new Map<
        string,
        { section: string; groupTitle: string; groupOrder: number }
    >();

    for (const article of articles) {
        if (articleBySlug.has(article.slug)) {
            throw new Error(`Duplicate docs slug "${article.slug}" found in the docs catalog.`);
        }

        articleBySlug.set(article.slug, article);
        contentPathToSlug.set(toDocsContentPathname(article.sourcePath), article.slug);

        const previousSection = sectionMetadataByKey.get(article.section);
        if (
            previousSection &&
            (previousSection.sectionTitle !== article.sectionTitle ||
                previousSection.sectionOrder !== article.sectionOrder)
        ) {
            throw new Error(
                `Docs section "${article.section}" must keep a consistent title and order across files.`,
            );
        }

        sectionMetadataByKey.set(article.section, {
            sectionTitle: article.sectionTitle,
            sectionOrder: article.sectionOrder,
        });

        if (article.group && article.groupTitle && article.groupOrder !== undefined) {
            const previous = groupMetadataByKey.get(article.group);

            if (
                previous &&
                (previous.section !== article.section ||
                    previous.groupTitle !== article.groupTitle ||
                    previous.groupOrder !== article.groupOrder)
            ) {
                throw new Error(
                    `Docs group "${article.group}" must keep a consistent title, order, and section across files.`,
                );
            }

            groupMetadataByKey.set(article.group, {
                section: article.section,
                groupTitle: article.groupTitle,
                groupOrder: article.groupOrder,
            });
        }
    }

    for (const page of pages) {
        if (pagesById.has(page.id)) {
            throw new Error(`Duplicate docs page id "${page.id}" found in the docs catalog.`);
        }

        pagesById.set(page.id, page);
    }

    return {
        articles,
        pagesById,
        articleBySlug,
        navSections: buildDocsNavSections(articles),
        pagerBySlug: buildDocsPagerBySlug(articles),
        contentPathToSlug,
    };
}

export function parseDocsFrontmatter(raw: string): ParsedDocsFrontmatter {
    const normalizedRaw = raw.replace(/\r\n/g, "\n");
    if (!normalizedRaw.startsWith("---\n")) {
        return {
            attributes: {},
            body: normalizedRaw,
        };
    }

    const match = normalizedRaw.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) {
        throw new Error("Invalid docs frontmatter: missing closing delimiter.");
    }

    return {
        attributes: parseDocsFrontmatterAttributes(match[1]),
        body: normalizedRaw.slice(match[0].length),
    };
}

function loadMarkdownModules(): Record<string, string> | null {
    try {
        return import.meta.glob<string>("../../../docs/**/*.md", {
            eager: true,
            query: "?raw",
            import: "default",
        });
    } catch {
        return null;
    }
}

function loadMetaModules(): Record<string, Record<string, unknown>> | null {
    try {
        return import.meta.glob<Record<string, unknown>>("../../../docs/**/_meta.json", {
            eager: true,
            import: "default",
        });
    } catch {
        return null;
    }
}

function discoverDocsFiles(rootPath: string): readonly DocsSourceFile[] {
    if (preloadedMarkdownModules) {
        return Object.entries(preloadedMarkdownModules)
            .filter(([sourcePath]) => isWithinRootPath(sourcePath, rootPath))
            .map(([sourcePath, raw]) => ({
                sourcePath: sourcePath.replace(/\\/g, "/"),
                raw,
            }))
            .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
    }

    const maybeDeno = (globalThis as {
        Deno?: {
            readDirSync(path: URL): Iterable<{ name: string; isDirectory: boolean; isFile: boolean }>;
            readTextFileSync(path: URL): string;
        };
    }).Deno;

    if (!maybeDeno) {
        throw new Error("Unable to discover docs markdown files in this runtime.");
    }

    return collectDenoDocsFiles(
        maybeDeno,
        new URL(/* @vite-ignore */ rootPath, import.meta.url),
        rootPath,
    );
}

function discoverDocsMetaFiles(rootPath: string): readonly DocsMetaFile[] {
    if (preloadedMetaModules) {
        return Object.entries(preloadedMetaModules)
            .filter(([sourcePath]) => isWithinRootPath(sourcePath, rootPath))
            .map(([sourcePath, attributes]) => ({
                sourcePath: sourcePath.replace(/\\/g, "/"),
                attributes,
            }))
            .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
    }

    const maybeDeno = (globalThis as {
        Deno?: {
            readDirSync(path: URL): Iterable<{ name: string; isDirectory: boolean; isFile: boolean }>;
            readTextFileSync(path: URL): string;
        };
    }).Deno;

    if (!maybeDeno) {
        throw new Error("Unable to discover docs meta files in this runtime.");
    }

    return collectDenoDocsMetaFiles(
        maybeDeno,
        new URL(/* @vite-ignore */ rootPath, import.meta.url),
        rootPath,
    );
}

function collectDenoDocsFiles(
    deno: {
        readDirSync(path: URL): Iterable<{ name: string; isDirectory: boolean; isFile: boolean }>;
        readTextFileSync(path: URL): string;
    },
    directoryUrl: URL,
    relativePath: string,
): readonly DocsSourceFile[] {
    const files: DocsSourceFile[] = [];

    for (const entry of deno.readDirSync(directoryUrl)) {
        const childUrl = new URL(`${entry.name}${entry.isDirectory ? "/" : ""}`, directoryUrl);
        const childRelativePath = `${relativePath}${entry.name}`;

        if (entry.isDirectory) {
            files.push(...collectDenoDocsFiles(deno, childUrl, `${childRelativePath}/`));
            continue;
        }

        if (!entry.isFile || !entry.name.endsWith(".md")) {
            continue;
        }

        files.push({
            sourcePath: normalizeRootPath(childRelativePath).slice(0, -1),
            raw: deno.readTextFileSync(childUrl),
        });
    }

    return files.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function collectDenoDocsMetaFiles(
    deno: {
        readDirSync(path: URL): Iterable<{ name: string; isDirectory: boolean; isFile: boolean }>;
        readTextFileSync(path: URL): string;
    },
    directoryUrl: URL,
    relativePath: string,
): readonly DocsMetaFile[] {
    const files: DocsMetaFile[] = [];

    for (const entry of deno.readDirSync(directoryUrl)) {
        const childUrl = new URL(`${entry.name}${entry.isDirectory ? "/" : ""}`, directoryUrl);
        const childRelativePath = `${relativePath}${entry.name}`;

        if (entry.isDirectory) {
            files.push(...collectDenoDocsMetaFiles(deno, childUrl, `${childRelativePath}/`));
            continue;
        }

        if (!entry.isFile || entry.name !== "_meta.json") {
            continue;
        }

        files.push({
            sourcePath: normalizeRootPath(childRelativePath).slice(0, -1),
            attributes: JSON.parse(deno.readTextFileSync(childUrl)) as Record<string, unknown>,
        });
    }

    return files.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function buildDirectoryMetaByPath(
    metaFiles: readonly DocsMetaFile[],
): ReadonlyMap<string, DocsDirectoryMeta> {
    return new Map(
        metaFiles.map((file) => [
            normalizeDirectoryPath(file.sourcePath.replace(/\/_meta\.json$/i, "")),
            normalizeDocsDirectoryMeta(file.sourcePath, file.attributes),
        ] as const),
    );
}

function normalizeDocsFile(
    file: DocsSourceFile,
    directoryMetaByPath: ReadonlyMap<string, DocsDirectoryMeta>,
): DocsNormalizedFile | null {
    const normalizedSourcePath = file.sourcePath.replace(/\\/g, "/");
    const currentDirectoryPath = collectDirectoryAncestors(normalizedSourcePath).at(-1);
    const currentDirectoryMetadata = currentDirectoryPath
        ? directoryMetaByPath.get(currentDirectoryPath)
        : undefined;
    const currentFileName = normalizedSourcePath.split("/").at(-1);

    const frontmatter = parseDocsFrontmatter(file.raw);

    if (Object.keys(frontmatter.attributes).length === 0) {
        return null;
    }

    const inheritedAttributes = resolveInheritedDirectoryMeta(file.sourcePath, directoryMetaByPath);
    const attributes = Object.freeze({
        ...inheritedAttributes,
        ...frontmatter.attributes,
    });
    const kind = readOptionalString(attributes, "kind") === "page" ? "page" : "article";

    if (
        kind === "article" &&
        currentDirectoryMetadata?.articles &&
        currentFileName &&
        !currentDirectoryMetadata.articles.has(currentFileName)
    ) {
        return null;
    }

    if (kind === "page") {
        const id = readRequiredString(attributes, "id", file.sourcePath);
        const title = readRequiredString(attributes, "title", file.sourcePath);
        const summary = readRequiredString(attributes, "summary", file.sourcePath);

        return {
            kind,
            id,
            title,
            summary,
            statusLabel: readOptionalString(attributes, "statusLabel"),
            pageTitle: readOptionalString(attributes, "pageTitle"),
            description: readOptionalString(attributes, "description"),
            markdown: frontmatter.body,
            sourcePath: normalizedSourcePath,
            frontmatter: attributes,
        };
    }

    const title = readRequiredString(attributes, "title", file.sourcePath);
    const slug = readOptionalString(attributes, "slug") ?? deriveSlugFromPath(file.sourcePath);
    const section = readRequiredString(attributes, "section", file.sourcePath);
    const sectionTitle = readRequiredString(attributes, "sectionTitle", file.sourcePath);
    const sectionOrder = readRequiredNumber(attributes, "sectionOrder", file.sourcePath);
    const order = readRequiredNumber(attributes, "order", file.sourcePath);
    const summary = readOptionalString(attributes, "summary");
    const group = readOptionalString(attributes, "group");
    const groupTitle = readOptionalString(attributes, "groupTitle");
    const groupOrder = readOptionalNumber(attributes, "groupOrder");

    if (group || groupTitle || groupOrder !== undefined) {
        if (!group || !groupTitle || groupOrder === undefined) {
            throw new Error(
                `Docs file "${file.sourcePath}" must define group, groupTitle, and groupOrder together.`,
            );
        }
    }

    return {
        kind,
        slug,
        title,
        summary,
        section,
        sectionTitle,
        sectionOrder,
        group,
        groupTitle,
        groupOrder,
        order,
        markdown: frontmatter.body,
        sourcePath: normalizedSourcePath,
        frontmatter: attributes,
    };
}

function resolveInheritedDirectoryMeta(
    sourcePath: string,
    directoryMetaByPath: ReadonlyMap<string, DocsDirectoryMeta>,
): Record<string, string | number> {
    const inherited: Record<string, string | number> = {};
    const directories = collectDirectoryAncestors(sourcePath);
    const articleFileName = sourcePath.replace(/\\/g, "/").split("/").at(-1);

    for (const directoryPath of directories) {
        const metadata = directoryMetaByPath.get(directoryPath);
        if (metadata) {
            Object.assign(inherited, metadata.attributes);
        }
    }

    if (articleFileName) {
        const currentDirectoryPath = directories.at(-1);
        const currentDirectoryMetadata = currentDirectoryPath
            ? directoryMetaByPath.get(currentDirectoryPath)
            : undefined;
        const articleMetadata = currentDirectoryMetadata?.articles?.get(articleFileName);
        if (articleMetadata) {
            Object.assign(inherited, articleMetadata);
        }
    }

    return inherited;
}

function normalizeDocsDirectoryMeta(
    sourcePath: string,
    rawAttributes: Record<string, unknown>,
): DocsDirectoryMeta {
    const attributes: Record<string, string | number> = {};
    let articles: ReadonlyMap<string, Readonly<Record<string, string | number>>> | undefined;

    for (const [key, value] of Object.entries(rawAttributes)) {
        if (key === "articles") {
            articles = normalizeDocsDirectoryArticles(sourcePath, value);
            continue;
        }

        if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
            attributes[key] = value;
            continue;
        }

        throw new Error(
            `Docs meta file "${sourcePath}" contains unsupported value for "${key}".`,
        );
    }

    return {
        attributes: Object.freeze(attributes),
        articles,
    };
}

function normalizeDocsDirectoryArticles(
    sourcePath: string,
    value: unknown,
): ReadonlyMap<string, Readonly<Record<string, string | number>>> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Docs meta file "${sourcePath}" must define "articles" as an object.`);
    }

    const entries = new Map<string, Readonly<Record<string, string | number>>>();

    for (const [fileName, rawEntry] of Object.entries(value)) {
        if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
            throw new Error(
                `Docs meta file "${sourcePath}" must define article metadata for "${fileName}" as an object.`,
            );
        }

        const entry: Record<string, string | number> = {};
        for (const [key, rawValue] of Object.entries(rawEntry)) {
            if (
                typeof rawValue === "string" ||
                (typeof rawValue === "number" && Number.isFinite(rawValue))
            ) {
                entry[key] = rawValue;
                continue;
            }

            throw new Error(
                `Docs meta file "${sourcePath}" contains unsupported article metadata for "${fileName}.${key}".`,
            );
        }

        entries.set(fileName, Object.freeze(entry));
    }

    return entries;
}

function assertDeclaredDocsArticlesExist(
    normalizedFiles: readonly DocsNormalizedFile[],
    directoryMetaByPath: ReadonlyMap<string, DocsDirectoryMeta>,
): void {
    const discoveredArticleFilesByDirectory = new Map<string, Set<string>>();

    for (const file of normalizedFiles) {
        if (file.kind !== "article") {
            continue;
        }

        const normalizedSourcePath = file.sourcePath.replace(/\\/g, "/");
        const fileName = normalizedSourcePath.split("/").at(-1);
        const directoryPath = collectDirectoryAncestors(normalizedSourcePath).at(-1);
        if (!fileName || !directoryPath) {
            continue;
        }

        const discovered = discoveredArticleFilesByDirectory.get(directoryPath) ?? new Set<string>();
        discovered.add(fileName);
        discoveredArticleFilesByDirectory.set(directoryPath, discovered);
    }

    for (const [directoryPath, metadata] of directoryMetaByPath.entries()) {
        if (!metadata.articles) {
            continue;
        }

        const discovered = discoveredArticleFilesByDirectory.get(directoryPath) ?? new Set<string>();
        for (const fileName of metadata.articles.keys()) {
            if (!discovered.has(fileName)) {
                throw new Error(
                    `Docs metadata declares article "${fileName}" in "${directoryPath}", but no matching article file was discovered.`,
                );
            }
        }
    }
}

function collectDirectoryAncestors(sourcePath: string): readonly string[] {
    const normalizedPath = sourcePath.replace(/\\/g, "/");
    const segments = normalizedPath.split("/");
    segments.pop();

    const directories: string[] = [];
    for (let index = 1; index <= segments.length; index += 1) {
        directories.push(normalizeDirectoryPath(segments.slice(0, index).join("/")));
    }

    return directories;
}

function buildDocsNavSections(articles: readonly DocsArticle[]): readonly DocsNavSection[] {
    const sections = new Map<
        string,
        {
            title: string;
            order: number;
            items: DocsNavLeaf[];
            groups: Map<string, { title: string; order: number; items: DocsNavLeaf[] }>;
        }
    >();

    for (const article of articles) {
        const section = sections.get(article.section) ?? {
            title: article.sectionTitle,
            order: article.sectionOrder,
            items: [],
            groups: new Map<string, { title: string; order: number; items: DocsNavLeaf[] }>(),
        };

        const item = {
            slug: article.slug,
            title: article.title,
        };

        if (article.group && article.groupTitle && article.groupOrder !== undefined) {
            const group = section.groups.get(article.group) ?? {
                title: article.groupTitle,
                order: article.groupOrder,
                items: [],
            };

            group.items.push(item);
            section.groups.set(article.group, group);
        } else {
            section.items.push(item);
        }

        sections.set(article.section, section);
    }

    return Array.from(sections.values())
        .sort((left, right) => compareOrderedValues(left.order, left.title, right.order, right.title))
        .map((section) => ({
            title: section.title,
            items: section.items,
            groups: section.groups.size > 0
                ? Array.from(section.groups.values())
                    .sort((left, right) =>
                        compareOrderedValues(left.order, left.title, right.order, right.title)
                    )
                    .map((group) => ({
                        title: group.title,
                        items: group.items,
                    }))
                : undefined,
        }));
}

function buildDocsPagerBySlug(
    articles: readonly DocsArticle[],
): ReadonlyMap<string, { previous?: DocsPagerLink; next?: DocsPagerLink }> {
    const pagerBySlug = new Map<string, { previous?: DocsPagerLink; next?: DocsPagerLink }>();

    for (const [index, article] of articles.entries()) {
        const previous = articles[index - 1];
        const next = articles[index + 1];

        pagerBySlug.set(article.slug, {
            previous: previous ? { slug: previous.slug, title: previous.title } : undefined,
            next: next ? { slug: next.slug, title: next.title } : undefined,
        });
    }

    return pagerBySlug;
}

function resolveDocsMarkdownHrefFromCatalog(
    catalog: DocsCatalog,
    currentSlug: string | undefined,
    href: string,
): string {
    const trimmedHref = href.trim();

    if (!trimmedHref || trimmedHref.startsWith("#") || hasAbsoluteHref(trimmedHref)) {
        return trimmedHref;
    }

    if (trimmedHref.startsWith("/")) {
        return trimmedHref;
    }

    if (!currentSlug) {
        return trimmedHref;
    }

    const currentArticle = catalog.articleBySlug.get(currentSlug);
    if (!currentArticle) {
        return trimmedHref;
    }

    const currentPathname = toDocsContentPathname(currentArticle.sourcePath);
    const resolvedUrl = new URL(trimmedHref, new URL(currentPathname, "https://mainz.local"));
    const targetSlug = catalog.contentPathToSlug.get(resolvedUrl.pathname);

    if (!targetSlug) {
        return trimmedHref;
    }

    return `/${targetSlug}${resolvedUrl.hash}`;
}

function parseDocsFrontmatterAttributes(block: string): Record<string, string | number> {
    const attributes: Record<string, string | number> = {};

    for (const rawLine of block.split("\n")) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
            throw new Error(`Invalid docs frontmatter line "${line}". Expected "key: value".`);
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        attributes[key] = parseDocsFrontmatterValue(value);
    }

    return attributes;
}

function parseDocsFrontmatterValue(value: string): string | number {
    const unquotedValue = (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    )
        ? value.slice(1, -1)
        : value;

    return /^-?\d+$/.test(unquotedValue) ? Number(unquotedValue) : unquotedValue;
}

function readRequiredString(
    attributes: Record<string, string | number>,
    key: string,
    sourcePath: string,
): string {
    const value = readOptionalString(attributes, key);
    if (!value) {
        throw new Error(`Docs file "${sourcePath}" is missing required frontmatter field "${key}".`);
    }

    return value;
}

function readOptionalString(
    attributes: Record<string, string | number>,
    key: string,
): string | undefined {
    const value = attributes[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRequiredNumber(
    attributes: Record<string, string | number>,
    key: string,
    sourcePath: string,
): number {
    const value = readOptionalNumber(attributes, key);
    if (value === undefined) {
        throw new Error(`Docs file "${sourcePath}" is missing required frontmatter field "${key}".`);
    }

    return value;
}

function readOptionalNumber(
    attributes: Record<string, string | number>,
    key: string,
): number | undefined {
    const value = attributes[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function deriveSlugFromPath(sourcePath: string): string {
    const fileName = sourcePath.split("/").at(-1) ?? sourcePath;
    return fileName.replace(/\.md$/i, "");
}

function compareDocsArticles(left: DocsArticle, right: DocsArticle): number {
    const sectionComparison = compareOrderedValues(
        left.sectionOrder,
        left.sectionTitle,
        right.sectionOrder,
        right.sectionTitle,
    );
    if (sectionComparison !== 0) {
        return sectionComparison;
    }

    const leftGroupRank = left.group ? 1 : 0;
    const rightGroupRank = right.group ? 1 : 0;
    if (leftGroupRank !== rightGroupRank) {
        return leftGroupRank - rightGroupRank;
    }

    const groupComparison = compareOrderedValues(
        left.groupOrder ?? 0,
        left.groupTitle ?? "",
        right.groupOrder ?? 0,
        right.groupTitle ?? "",
    );
    if (groupComparison !== 0) {
        return groupComparison;
    }

    const articleComparison = left.order - right.order;
    if (articleComparison !== 0) {
        return articleComparison;
    }

    return left.title.localeCompare(right.title);
}

function compareOrderedValues(
    leftOrder: number,
    leftLabel: string,
    rightOrder: number,
    rightLabel: string,
): number {
    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }

    return leftLabel.localeCompare(rightLabel);
}

function toArticleMeta(article: DocsArticle): DocsArticleMeta {
    return {
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        section: article.section,
        sectionTitle: article.sectionTitle,
        sectionOrder: article.sectionOrder,
        group: article.group,
        groupTitle: article.groupTitle,
        groupOrder: article.groupOrder,
        order: article.order,
    };
}

function normalizeRootPath(rootPath: string): string {
    const normalized = rootPath.replace(/\\/g, "/");
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function isWithinRootPath(sourcePath: string, rootPath: string): boolean {
    return sourcePath.replace(/\\/g, "/").startsWith(normalizeRootPath(rootPath));
}

function normalizeDirectoryPath(path: string): string {
    return path.replace(/\\/g, "/").replace(/\/+$/g, "");
}

function toDocsContentPathname(sourcePath: string): string {
    const normalizedPath = sourcePath.replace(/\\/g, "/");
    const withoutRelativePrefix = normalizedPath.replace(/^(\.\.\/)+/, "/");
    return withoutRelativePrefix.startsWith("/")
        ? withoutRelativePrefix
        : `/${withoutRelativePrefix}`;
}

function hasAbsoluteHref(href: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}
