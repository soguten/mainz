import type { PageRenderMode } from "./page-metadata.ts";

export type AssetTarget = "head" | "body:start" | "body:end";
export type ScriptAssetStrategy = "async" | "defer" | "module" | "blocking";

export interface LinkAssetAttributes {
  rel: string;
  href: string;
  as?: string;
  crossorigin?: "anonymous" | "use-credentials" | "";
  fetchpriority?: "high" | "low" | "auto";
  hreflang?: string;
  imagesizes?: string;
  imagesrcset?: string;
  integrity?: string;
  media?: string;
  referrerpolicy?:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  sizes?: string;
  type?: string;
}

export interface AssetContext {
  app: {
    id: string;
  };
  env: {
    dev: boolean;
    prod: boolean;
    mode?: string;
  };
  runtime: {
    phase: "build" | "client";
    renderMode: "csr" | "ssr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
  };
  route: {
    path: string;
    matchedPath?: string;
    locale?: string;
  };
  target?: {
    name: string;
  };
}

export interface AssetDefinitionBase {
  id: string;
  target?: AssetTarget;
  when?: (context: AssetContext) => boolean;
  before?: readonly string[];
  after?: readonly string[];
  dependsOn?: readonly string[];
}

export interface DisabledAssetDefinition extends AssetDefinitionBase {
  disabled: true;
}

export interface ScriptAssetDefinition extends AssetDefinitionBase {
  kind: "script";
  src?: string;
  inline?: string;
  type?: string;
  strategy?: ScriptAssetStrategy;
}

export interface StyleAssetDefinition extends AssetDefinitionBase {
  kind: "style";
  css: string;
  media?: string;
  nonce?: string;
  type?: string;
}

export interface NoscriptAssetDefinition extends AssetDefinitionBase {
  kind: "noscript";
  html: string;
}

export interface LinkAssetDefinition
  extends AssetDefinitionBase, LinkAssetAttributes {
  kind: "link";
}

export type AssetDefinition =
  | DisabledAssetDefinition
  | ScriptAssetDefinition
  | StyleAssetDefinition
  | NoscriptAssetDefinition
  | LinkAssetDefinition;

export function script(
  definition: Omit<ScriptAssetDefinition, "kind">,
): ScriptAssetDefinition {
  return {
    kind: "script",
    ...definition,
  };
}

export function link(
  definition: Omit<LinkAssetDefinition, "kind">,
): LinkAssetDefinition {
  return {
    kind: "link",
    ...definition,
  };
}

export function style(
  definition: Omit<StyleAssetDefinition, "kind">,
): StyleAssetDefinition {
  return {
    kind: "style",
    ...definition,
  };
}

export function noscript(
  definition: Omit<NoscriptAssetDefinition, "kind">,
): NoscriptAssetDefinition {
  return {
    kind: "noscript",
    ...definition,
  };
}

export function disableAsset(
  definition: Omit<DisabledAssetDefinition, "disabled"> | string,
): DisabledAssetDefinition {
  if (typeof definition === "string") {
    return {
      id: definition,
      disabled: true,
    };
  }

  return {
    disabled: true,
    ...definition,
  };
}

export const MAINZ_ASSET_MANAGED_ATTR = "data-mainz-asset-managed";
const MAINZ_ASSET_ID_ATTR = "data-mainz-asset-id";
const MAINZ_ASSET_TARGET_ATTR = "data-mainz-asset-target";
const MAINZ_ASSET_SIGNATURE_ATTR = "data-mainz-asset-signature";

export function createAssetContext(args: {
  appId?: string;
  phase: "build" | "client";
  renderMode: PageRenderMode;
  navigation: "spa" | "mpa" | "enhanced-mpa";
  path: string;
  matchedPath?: string;
  locale?: string;
  targetName?: string;
  envMode?: string;
}): AssetContext {
  const importMetaEnv = (import.meta as {
    env?: { DEV?: boolean; PROD?: boolean; MODE?: string };
  }).env;
  const resolvedMode = args.envMode ?? importMetaEnv?.MODE;

  return {
    app: {
      id: args.appId ?? "mainz-app",
    },
    env: {
      dev: resolveDevFlag(resolvedMode, importMetaEnv?.DEV),
      prod: resolveProdFlag(resolvedMode, importMetaEnv?.PROD),
      mode: resolvedMode,
    },
    runtime: {
      phase: args.phase,
      renderMode: args.renderMode,
      navigation: args.navigation,
    },
    route: {
      path: args.path,
      matchedPath: args.matchedPath,
      locale: args.locale,
    },
    target: args.targetName
      ? {
        name: args.targetName,
      }
      : undefined,
  };
}

export function resolveAssetDefinitions(args: {
  appAssets?: readonly AssetDefinition[];
  pageAssets?: readonly AssetDefinition[];
  context: AssetContext;
}): readonly AssetDefinition[] {
  const surviving = mergeAssetsById([
    ...filterAssetsByWhen(args.appAssets, args.context, "app"),
    ...filterAssetsByWhen(args.pageAssets, args.context, "page"),
  ]);

  return sortAssetDefinitions(surviving);
}

export function applyResolvedAssetDefinitionsToDocument(
  assets: readonly AssetDefinition[] | undefined,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const normalizedAssets = assets ?? [];
  const nextById = new Map(normalizedAssets.map((asset) => [asset.id, asset]));
  const existingManaged = Array.from(
    document.querySelectorAll<HTMLElement>(`[${MAINZ_ASSET_MANAGED_ATTR}]`),
  );
  const reusableNodes = new Map<string, HTMLElement>();

  for (const node of existingManaged) {
    const assetId = node.getAttribute(MAINZ_ASSET_ID_ATTR);
    if (!assetId) {
      node.remove();
      continue;
    }

    const nextAsset = nextById.get(assetId);
    if (!nextAsset) {
      node.remove();
      continue;
    }

    const nextSignature = serializeAssetDefinition(nextAsset);
    const currentSignature = node.getAttribute(MAINZ_ASSET_SIGNATURE_ATTR) ??
      serializeAssetNode(node);
    if (currentSignature !== nextSignature) {
      node.remove();
      continue;
    }

    if (!node.hasAttribute(MAINZ_ASSET_SIGNATURE_ATTR)) {
      node.setAttribute(MAINZ_ASSET_SIGNATURE_ATTR, nextSignature);
    }

    reusableNodes.set(assetId, node);
  }

  const nextHeadNodes: HTMLElement[] = [];
  const nextBodyStartNodes: HTMLElement[] = [];
  const nextBodyEndNodes: HTMLElement[] = [];

  for (const asset of normalizedAssets) {
    const node = reusableNodes.get(asset.id) ?? createAssetNode(asset);
    placeNodeForTarget(asset, node, {
      head: nextHeadNodes,
      bodyStart: nextBodyStartNodes,
      bodyEnd: nextBodyEndNodes,
    });
  }

  const head = document.head;
  if (head) {
    for (const node of nextHeadNodes) {
      head.appendChild(node);
    }
  }

  const body = document.body;
  if (body) {
    const bodyStartAnchor = body.firstChild;
    for (const node of nextBodyStartNodes) {
      body.insertBefore(node, bodyStartAnchor);
    }
    for (const node of nextBodyEndNodes) {
      body.appendChild(node);
    }
  }
}

export function applyResolvedAssetDefinitionsToHtml(
  html: string,
  assets: readonly AssetDefinition[] | undefined,
): string {
  const normalizedAssets = assets ?? [];
  if (normalizedAssets.length === 0) {
    return html;
  }

  const headTags: string[] = [];
  const bodyStartTags: string[] = [];
  const bodyEndTags: string[] = [];

  for (const asset of normalizedAssets) {
    const tag = renderAssetTag(asset);
    const target = asset.target ?? "head";
    if (target === "head") {
      headTags.push(tag);
      continue;
    }

    if (target === "body:start") {
      bodyStartTags.push(tag);
      continue;
    }

    bodyEndTags.push(tag);
  }

  let nextHtml = html;

  if (headTags.length > 0) {
    nextHtml = nextHtml.replace(
      "</head>",
      `  ${headTags.join("\n  ")}\n</head>`,
    );
  }

  if (bodyStartTags.length > 0) {
    nextHtml = nextHtml.replace(
      /<body([^>]*)>/i,
      `<body$1>\n  ${bodyStartTags.join("\n  ")}`,
    );
  }

  if (bodyEndTags.length > 0) {
    nextHtml = nextHtml.replace(
      "</body>",
      `  ${bodyEndTags.join("\n  ")}\n</body>`,
    );
  }

  return nextHtml;
}

export function isAssetDefinition(value: unknown): value is AssetDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.disabled === true && typeof candidate.id === "string") {
    return true;
  }

  return (
    candidate.kind === "script" ||
    candidate.kind === "link" ||
    candidate.kind === "style" ||
    candidate.kind === "noscript"
  ) &&
    typeof candidate.id === "string";
}

export function isAssetDefinitionList(
  value: unknown,
): value is readonly AssetDefinition[] {
  return Array.isArray(value) &&
    value.every((entry) => isAssetDefinition(entry));
}

function isDisabledAssetDefinition(
  asset: AssetDefinition,
): asset is DisabledAssetDefinition {
  return "disabled" in asset && asset.disabled === true;
}

function isScriptAssetDefinition(
  asset: AssetDefinition,
): asset is ScriptAssetDefinition {
  return "kind" in asset && asset.kind === "script";
}

function isLinkAssetDefinition(
  asset: AssetDefinition,
): asset is LinkAssetDefinition {
  return "kind" in asset && asset.kind === "link";
}

function isStyleAssetDefinition(
  asset: AssetDefinition,
): asset is StyleAssetDefinition {
  return "kind" in asset && asset.kind === "style";
}

function isNoscriptAssetDefinition(
  asset: AssetDefinition,
): asset is NoscriptAssetDefinition {
  return "kind" in asset && asset.kind === "noscript";
}

function resolveDevFlag(
  mode: string | undefined,
  importMetaDev?: boolean,
): boolean {
  if (typeof importMetaDev === "boolean") {
    return importMetaDev;
  }

  return mode === "development" || mode === "dev";
}

function resolveProdFlag(
  mode: string | undefined,
  importMetaProd?: boolean,
): boolean {
  if (typeof importMetaProd === "boolean") {
    return importMetaProd;
  }

  return mode === "production" || mode === "prod";
}

function filterAssetsByWhen(
  assets: readonly AssetDefinition[] | undefined,
  context: AssetContext,
  scope: "app" | "page",
): Array<{ asset: AssetDefinition; scope: "app" | "page"; index: number }> {
  if (!assets?.length) {
    return [];
  }

  return assets.flatMap((asset, index) => {
    if (asset.when && !asset.when(context)) {
      return [];
    }

    return [{ asset, scope, index }];
  });
}

function mergeAssetsById(
  candidates: Array<
    { asset: AssetDefinition; scope: "app" | "page"; index: number }
  >,
): Array<
  {
    asset: AssetDefinition;
    scope: "app" | "page";
    index: number;
    order: number;
  }
> {
  const merged = new Map<
    string,
    {
      asset: AssetDefinition;
      scope: "app" | "page";
      index: number;
      order: number;
    }
  >();

  for (const [order, candidate] of candidates.entries()) {
    if (merged.has(candidate.asset.id)) {
      merged.delete(candidate.asset.id);
    }

    merged.set(candidate.asset.id, {
      ...candidate,
      order,
    });
  }

  return Array.from(merged.values()).filter((candidate) =>
    !isDisabledAssetDefinition(candidate.asset)
  );
}

function sortAssetDefinitions(
  candidates: Array<
    {
      asset: AssetDefinition;
      scope: "app" | "page";
      index: number;
      order: number;
    }
  >,
): readonly AssetDefinition[] {
  const byId = new Map(
    candidates.map((candidate) => [candidate.asset.id, candidate]),
  );
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, Set<string>>();

  for (const candidate of candidates) {
    incoming.set(candidate.asset.id, 0);
    outgoing.set(candidate.asset.id, new Set());
  }

  for (const candidate of candidates) {
    addDependencyEdges(
      candidate.asset.dependsOn,
      candidate.asset.id,
      byId,
      outgoing,
      incoming,
      "dependsOn",
    );
    addDependencyEdges(
      candidate.asset.after,
      candidate.asset.id,
      byId,
      outgoing,
      incoming,
      "after",
    );

    for (const beforeId of candidate.asset.before ?? []) {
      const referenced = byId.get(beforeId);
      if (!referenced) {
        continue;
      }

      assertCompatibleTargets(
        candidate.asset,
        referenced.asset,
        "before",
        beforeId,
      );
      addGraphEdge(candidate.asset.id, beforeId, outgoing, incoming);
    }
  }

  const queue = candidates
    .filter((candidate) => incoming.get(candidate.asset.id) === 0)
    .sort((left, right) => left.order - right.order);
  const ordered: AssetDefinition[] = [];

  while (queue.length > 0) {
    const next = queue.shift()!;
    ordered.push(next.asset);

    const outgoingIds = Array.from(outgoing.get(next.asset.id) ?? [])
      .map((assetId) => byId.get(assetId))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => left.order - right.order);

    for (const dependent of outgoingIds) {
      const currentIncoming = (incoming.get(dependent.asset.id) ?? 0) - 1;
      incoming.set(dependent.asset.id, currentIncoming);
      if (currentIncoming === 0) {
        queue.push(dependent);
        queue.sort((left, right) => left.order - right.order);
      }
    }
  }

  if (ordered.length !== candidates.length) {
    const unresolved = candidates
      .filter((candidate) =>
        !ordered.some((asset) => asset.id === candidate.asset.id)
      )
      .map((candidate) => describeAssetCandidate(candidate))
      .join(", ");
    throw new Error(
      `Asset ordering produced a cycle among ${unresolved}. ` +
        "Check dependsOn, before, and after relationships for circular references.",
    );
  }

  return ordered;
}

function addDependencyEdges(
  referencedIds: readonly string[] | undefined,
  currentId: string,
  byId: Map<string, { asset: AssetDefinition; order: number }>,
  outgoing: Map<string, Set<string>>,
  incoming: Map<string, number>,
  relation: "dependsOn" | "after",
): void {
  for (const referencedId of referencedIds ?? []) {
    const referenced = byId.get(referencedId);
    if (!referenced) {
      if (relation === "dependsOn") {
        const current = byId.get(currentId);
        const available = Array.from(byId.values())
          .map((candidate) => describeAssetCandidate(candidate))
          .join(", ");
        throw new Error(
          `${
            describeAssetCandidate(current)
          } depends on missing asset "${referencedId}".` +
            (available.length > 0
              ? ` Available assets after filtering: ${available}.`
              : " No other assets survived filtering."),
        );
      }

      continue;
    }

    assertCompatibleTargets(
      byId.get(currentId)?.asset,
      referenced.asset,
      relation,
      referencedId,
    );
    addGraphEdge(referencedId, currentId, outgoing, incoming);
  }
}

function addGraphEdge(
  fromId: string,
  toId: string,
  outgoing: Map<string, Set<string>>,
  incoming: Map<string, number>,
): void {
  const outgoingSet = outgoing.get(fromId);
  if (!outgoingSet || outgoingSet.has(toId)) {
    return;
  }

  outgoingSet.add(toId);
  incoming.set(toId, (incoming.get(toId) ?? 0) + 1);
}

function assertCompatibleTargets(
  left: AssetDefinition | undefined,
  right: AssetDefinition,
  relation: "dependsOn" | "after" | "before",
  rightId: string,
): void {
  if (!left) {
    return;
  }

  const leftTarget = left.target ?? "head";
  const rightTarget = right.target ?? "head";
  if (leftTarget === rightTarget) {
    return;
  }

  throw new Error(
    `${describeAsset(left)} cannot use ${relation} with ${
      describeAsset(right)
    } ` +
      `because they target different document regions ("${leftTarget}" vs "${rightTarget}").`,
  );
}

function describeAssetCandidate(
  candidate:
    | {
      asset: AssetDefinition;
      scope?: "app" | "page";
      order?: number;
      index?: number;
    }
    | undefined,
): string {
  if (!candidate) {
    return 'asset "<unknown>"';
  }

  return describeAsset(candidate.asset, candidate.scope);
}

function describeAsset(
  asset: AssetDefinition,
  scope?: "app" | "page",
): string {
  const kind = resolveAssetKind(asset);
  const target = asset.target ?? "head";
  const scopeLabel = scope ? `${scope} ` : "";
  return `${scopeLabel}${kind} asset "${asset.id}" targeting "${target}"`;
}

function resolveAssetKind(asset: AssetDefinition): string {
  if (isDisabledAssetDefinition(asset)) {
    return "disabled";
  }

  if (
    isScriptAssetDefinition(asset) || isLinkAssetDefinition(asset) ||
    isStyleAssetDefinition(asset) || isNoscriptAssetDefinition(asset)
  ) {
    return asset.kind;
  }

  return "unknown";
}

function createAssetNode(asset: AssetDefinition): HTMLElement {
  if (isDisabledAssetDefinition(asset)) {
    throw new Error(`Disabled asset "${asset.id}" should not be rendered.`);
  }

  if (isLinkAssetDefinition(asset)) {
    const element = document.createElement("link");
    applyLinkAssetAttributes(element, asset);
    annotateAssetNode(element, asset);
    return element;
  }

  if (isStyleAssetDefinition(asset)) {
    const element = document.createElement("style");
    applyStyleAssetAttributes(element, asset);
    annotateAssetNode(element, asset);
    return element;
  }

  if (isNoscriptAssetDefinition(asset)) {
    const element = document.createElement("noscript");
    element.innerHTML = asset.html;
    annotateAssetNode(element, asset);
    return element;
  }

  if (!isScriptAssetDefinition(asset)) {
    throw new Error("Unsupported asset definition.");
  }

  const element = document.createElement("script");
  const type = resolveScriptType(asset);
  if (type) {
    element.type = type;
  }
  if (asset.src) {
    element.src = asset.src;
  }
  if (asset.strategy === "async") {
    element.async = true;
  }
  if (asset.strategy === "defer") {
    element.defer = true;
  }
  if (asset.inline) {
    element.textContent = asset.inline;
  }
  annotateAssetNode(element, asset);
  return element;
}

function annotateAssetNode(element: HTMLElement, asset: AssetDefinition): void {
  element.setAttribute(MAINZ_ASSET_MANAGED_ATTR, "true");
  element.setAttribute(MAINZ_ASSET_ID_ATTR, asset.id);
  element.setAttribute(MAINZ_ASSET_TARGET_ATTR, asset.target ?? "head");
  element.setAttribute(
    MAINZ_ASSET_SIGNATURE_ATTR,
    serializeAssetDefinition(asset),
  );
}

function placeNodeForTarget(
  asset: AssetDefinition,
  node: HTMLElement,
  buckets: {
    head: HTMLElement[];
    bodyStart: HTMLElement[];
    bodyEnd: HTMLElement[];
  },
): void {
  const target = asset.target ?? "head";
  if (target === "head") {
    buckets.head.push(node);
    return;
  }

  if (target === "body:start") {
    buckets.bodyStart.push(node);
    return;
  }

  buckets.bodyEnd.push(node);
}

function serializeAssetDefinition(asset: AssetDefinition): string {
  return JSON.stringify({
    id: asset.id,
    kind: isScriptAssetDefinition(asset) || isLinkAssetDefinition(asset) ||
        isStyleAssetDefinition(asset) || isNoscriptAssetDefinition(asset)
      ? asset.kind
      : undefined,
    target: asset.target ?? "head",
    src: isScriptAssetDefinition(asset) ? asset.src : undefined,
    inline: isScriptAssetDefinition(asset) ? asset.inline : undefined,
    css: isStyleAssetDefinition(asset) ? asset.css : undefined,
    html: isNoscriptAssetDefinition(asset) ? asset.html : undefined,
    type: isScriptAssetDefinition(asset)
      ? asset.type
      : isLinkAssetDefinition(asset)
      ? asset.type
      : isStyleAssetDefinition(asset)
      ? asset.type
      : undefined,
    strategy: isScriptAssetDefinition(asset) ? asset.strategy : undefined,
    media: isStyleAssetDefinition(asset)
      ? asset.media
      : isLinkAssetDefinition(asset)
      ? asset.media
      : undefined,
    nonce: isStyleAssetDefinition(asset) ? asset.nonce : undefined,
    rel: isLinkAssetDefinition(asset) ? asset.rel : undefined,
    href: isLinkAssetDefinition(asset) ? asset.href : undefined,
    as: isLinkAssetDefinition(asset) ? asset.as : undefined,
    crossorigin: isLinkAssetDefinition(asset) ? asset.crossorigin : undefined,
    fetchpriority: isLinkAssetDefinition(asset)
      ? asset.fetchpriority
      : undefined,
    hreflang: isLinkAssetDefinition(asset) ? asset.hreflang : undefined,
    imagesizes: isLinkAssetDefinition(asset) ? asset.imagesizes : undefined,
    imagesrcset: isLinkAssetDefinition(asset) ? asset.imagesrcset : undefined,
    integrity: isLinkAssetDefinition(asset) ? asset.integrity : undefined,
    referrerpolicy: isLinkAssetDefinition(asset)
      ? asset.referrerpolicy
      : undefined,
    sizes: isLinkAssetDefinition(asset) ? asset.sizes : undefined,
    disabled: isDisabledAssetDefinition(asset) ? true : undefined,
  });
}

function renderAssetTag(asset: AssetDefinition): string {
  if (isDisabledAssetDefinition(asset)) {
    throw new Error(`Disabled asset "${asset.id}" should not be rendered.`);
  }

  if (isLinkAssetDefinition(asset)) {
    const attributes = [
      renderLinkAssetAttributes(asset),
      ` ${MAINZ_ASSET_MANAGED_ATTR}="true"`,
      ` ${MAINZ_ASSET_ID_ATTR}="${escapeHtmlAttribute(asset.id)}"`,
      ` ${MAINZ_ASSET_TARGET_ATTR}="${
        escapeHtmlAttribute(asset.target ?? "head")
      }"`,
    ].join("");

    return `<link${attributes}>`;
  }

  if (isStyleAssetDefinition(asset)) {
    const attributes = [
      asset.media ? ` media="${escapeHtmlAttribute(asset.media)}"` : "",
      asset.nonce ? ` nonce="${escapeHtmlAttribute(asset.nonce)}"` : "",
      asset.type ? ` type="${escapeHtmlAttribute(asset.type)}"` : "",
      ` ${MAINZ_ASSET_MANAGED_ATTR}="true"`,
      ` ${MAINZ_ASSET_ID_ATTR}="${escapeHtmlAttribute(asset.id)}"`,
      ` ${MAINZ_ASSET_TARGET_ATTR}="${
        escapeHtmlAttribute(asset.target ?? "head")
      }"`,
    ].join("");

    return `<style${attributes}>${escapeInlineStyle(asset.css)}</style>`;
  }

  if (isNoscriptAssetDefinition(asset)) {
    const attributes = [
      ` ${MAINZ_ASSET_MANAGED_ATTR}="true"`,
      ` ${MAINZ_ASSET_ID_ATTR}="${escapeHtmlAttribute(asset.id)}"`,
      ` ${MAINZ_ASSET_TARGET_ATTR}="${
        escapeHtmlAttribute(asset.target ?? "head")
      }"`,
    ].join("");

    return `<noscript${attributes}>${asset.html}</noscript>`;
  }

  if (!isScriptAssetDefinition(asset)) {
    throw new Error("Unsupported asset definition.");
  }

  const attributes = [
    resolveScriptType(asset)
      ? ` type="${escapeHtmlAttribute(resolveScriptType(asset)!)}"`
      : "",
    asset.src ? ` src="${escapeHtmlAttribute(asset.src)}"` : "",
    asset.strategy === "async" ? " async" : "",
    asset.strategy === "defer" ? " defer" : "",
    ` ${MAINZ_ASSET_MANAGED_ATTR}="true"`,
    ` ${MAINZ_ASSET_ID_ATTR}="${escapeHtmlAttribute(asset.id)}"`,
    ` ${MAINZ_ASSET_TARGET_ATTR}="${
      escapeHtmlAttribute(asset.target ?? "head")
    }"`,
  ].join("");

  return `<script${attributes}>${
    escapeInlineScript(asset.inline ?? "")
  }</script>`;
}

function resolveScriptType(asset: ScriptAssetDefinition): string | undefined {
  if (asset.type) {
    return asset.type;
  }

  if (asset.strategy === "module") {
    return "module";
  }

  return undefined;
}

function applyLinkAssetAttributes(
  element: HTMLLinkElement,
  asset: LinkAssetDefinition,
): void {
  element.rel = asset.rel;
  element.href = asset.href;

  const optionalAttributes = {
    as: asset.as,
    crossorigin: asset.crossorigin,
    fetchpriority: asset.fetchpriority,
    hreflang: asset.hreflang,
    imagesizes: asset.imagesizes,
    imagesrcset: asset.imagesrcset,
    integrity: asset.integrity,
    media: asset.media,
    referrerpolicy: asset.referrerpolicy,
    sizes: asset.sizes,
    type: asset.type,
  } satisfies Record<string, string | undefined>;

  for (const [name, value] of Object.entries(optionalAttributes)) {
    if (typeof value === "string") {
      element.setAttribute(name, value);
      continue;
    }

    element.removeAttribute(name);
  }
}

function renderLinkAssetAttributes(asset: LinkAssetDefinition): string {
  const attributes = [
    ["rel", asset.rel],
    ["href", asset.href],
    ["as", asset.as],
    ["crossorigin", asset.crossorigin],
    ["fetchpriority", asset.fetchpriority],
    ["hreflang", asset.hreflang],
    ["imagesizes", asset.imagesizes],
    ["imagesrcset", asset.imagesrcset],
    ["integrity", asset.integrity],
    ["media", asset.media],
    ["referrerpolicy", asset.referrerpolicy],
    ["sizes", asset.sizes],
    ["type", asset.type],
  ] as const;

  return attributes
    .flatMap(([name, value]) =>
      typeof value === "string"
        ? [` ${name}="${escapeHtmlAttribute(value)}"`]
        : []
    )
    .join("");
}

function applyStyleAssetAttributes(
  element: HTMLStyleElement,
  asset: StyleAssetDefinition,
): void {
  element.textContent = asset.css;

  const optionalAttributes = {
    media: asset.media,
    nonce: asset.nonce,
    type: asset.type,
  } satisfies Record<string, string | undefined>;

  for (const [name, value] of Object.entries(optionalAttributes)) {
    if (typeof value === "string") {
      element.setAttribute(name, value);
      continue;
    }

    element.removeAttribute(name);
  }
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeInlineScript(value: string): string {
  return value
    .replaceAll("</script>", "<\\/script>")
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function escapeInlineStyle(value: string): string {
  return value.replaceAll("</style>", "<\\/style>");
}

function serializeAssetNode(node: HTMLElement): string {
  const assetId = node.getAttribute(MAINZ_ASSET_ID_ATTR);
  const target = resolveNodeTarget(node);
  if (!assetId || !target) {
    return "";
  }

  if (node instanceof HTMLLinkElement) {
    return JSON.stringify({
      id: assetId,
      kind: "link",
      target,
      type: node.getAttribute("type") ?? undefined,
      media: node.getAttribute("media") ?? undefined,
      rel: node.rel || undefined,
      href: node.getAttribute("href") ?? undefined,
      as: node.getAttribute("as") ?? undefined,
      crossorigin: node.getAttribute("crossorigin") ?? undefined,
      fetchpriority: node.getAttribute("fetchpriority") ?? undefined,
      hreflang: node.getAttribute("hreflang") ?? undefined,
      imagesizes: node.getAttribute("imagesizes") ?? undefined,
      imagesrcset: node.getAttribute("imagesrcset") ?? undefined,
      integrity: node.getAttribute("integrity") ?? undefined,
      referrerpolicy: node.getAttribute("referrerpolicy") ?? undefined,
      sizes: node.getAttribute("sizes") ?? undefined,
    });
  }

  if (node instanceof HTMLStyleElement) {
    return JSON.stringify({
      id: assetId,
      kind: "style",
      target,
      css: node.textContent ?? undefined,
      type: node.getAttribute("type") ?? undefined,
      media: node.getAttribute("media") ?? undefined,
      nonce: node.getAttribute("nonce") ?? undefined,
    });
  }

  if (
    node instanceof HTMLElement && node.tagName.toLowerCase() === "noscript"
  ) {
    return JSON.stringify({
      id: assetId,
      kind: "noscript",
      target,
      html: node.innerHTML,
    });
  }

  if (node instanceof HTMLScriptElement) {
    const scriptType = node.getAttribute("type") ?? undefined;
    const strategy = scriptType === "module"
      ? "module"
      : node.async
      ? "async"
      : node.defer
      ? "defer"
      : undefined;

    return JSON.stringify({
      id: assetId,
      kind: "script",
      target,
      src: node.getAttribute("src") ?? undefined,
      inline: node.textContent ?? undefined,
      type: scriptType,
      strategy,
    });
  }

  return "";
}

function resolveNodeTarget(node: HTMLElement): AssetTarget | undefined {
  const explicitTarget = node.getAttribute(MAINZ_ASSET_TARGET_ATTR);
  if (
    explicitTarget === "head" || explicitTarget === "body:start" ||
    explicitTarget === "body:end"
  ) {
    return explicitTarget;
  }

  if (node.parentElement === document.head) {
    return "head";
  }

  if (node.parentElement === document.body) {
    return "body:end";
  }

  return undefined;
}
