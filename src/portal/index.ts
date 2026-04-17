import {
    isSsgBuildEnvironment,
    resolveComponentLoadEnvironment,
} from "../components/component-load.ts";
import { isDocumentFragmentLike, isNodeLike } from "../components/component-dom.ts";
import { getCurrentRenderOwner } from "../jsx/render-owner.ts";

export type PortalScope = "app" | "document";
export type PortalLayer = "overlay" | "popover" | "toast" | string;

export interface PortalProps {
    children?: unknown;
    layer?: PortalLayer;
    scope?: PortalScope;
    target?: HTMLElement;
}

const PORTAL_MARKER: unique symbol = Symbol("mainz.portal.marker");
const MAINZ_APP_ROOT_ATTR = "data-mainz-app-root";
const MAINZ_PORTAL_LAYER_ATTR = "data-mainz-portal-layer";
const MAINZ_MANAGED_PORTAL_LAYER_ATTR = "data-mainz-managed-portal-layer";
const MAINZ_DOCUMENT_PORTAL_LAYER_ATTR = "data-mainz-document-portal-layer";

export interface PortalDescriptor {
    children?: unknown;
    layer: PortalLayer;
    scope: PortalScope;
    target?: HTMLElement;
}

export type PortalMarkerNode = Comment & {
    [PORTAL_MARKER]: PortalDescriptor;
};

export function Portal(props: PortalProps): Comment {
    const ownerDocument = resolvePortalOwnerDocument();
    const marker = ownerDocument.createComment("mainz-portal") as PortalMarkerNode;
    marker[PORTAL_MARKER] = {
        children: props.children,
        layer: props.layer ?? "overlay",
        scope: props.scope ?? "app",
        target: props.target,
    };
    return marker;
}

export function isPortalMarkerNode(node: Node): node is PortalMarkerNode {
    return PORTAL_MARKER in node;
}

export function getPortalDescriptor(node: PortalMarkerNode): PortalDescriptor {
    return node[PORTAL_MARKER];
}

export function syncPortalMarkerNode(current: PortalMarkerNode, next: PortalMarkerNode): void {
    current[PORTAL_MARKER] = next[PORTAL_MARKER];
}

export function markMainzAppPortalRoot(root: HTMLElement): void {
    root.setAttribute(MAINZ_APP_ROOT_ATTR, "");
}

export function ensureDefaultAppPortalLayer(root: HTMLElement): HTMLElement {
    markMainzAppPortalRoot(root);
    return ensurePortalLayer(root, "overlay");
}

export function cleanupManagedAppPortalLayers(root: HTMLElement): void {
    for (const layer of findManagedPortalLayers(root)) {
        layer.remove();
    }
}

export function resolvePortalTarget(
    owner: HTMLElement,
    descriptor: PortalDescriptor,
): HTMLElement | undefined {
    if (isSsgBuildEnvironment(resolveComponentLoadEnvironment())) {
        return undefined;
    }

    if (descriptor.target) {
        return descriptor.target;
    }

    if (descriptor.scope === "document") {
        return ensureDocumentPortalLayer(owner.ownerDocument, descriptor.layer);
    }

    const appRoot = findNearestMainzAppRoot(owner);
    if (!appRoot) {
        console.warn(
            `Mainz Portal could not find an app root for layer "${descriptor.layer}". ` +
                "Call startApp(...) before rendering app-scoped portals.",
        );
        return undefined;
    }

    return ensurePortalLayer(appRoot, descriptor.layer);
}

export function toPortalRenderedNodes(children: unknown, ownerDocument: Document): Node[] {
    const fragment = ownerDocument.createDocumentFragment();
    appendPortalChildren(fragment, children, ownerDocument);
    return Array.from(fragment.childNodes);
}

function ensurePortalLayer(root: HTMLElement, layer: PortalLayer): HTMLElement {
    const existingLayer = findPortalLayer(root, layer);
    if (existingLayer) {
        return existingLayer;
    }

    const layerElement = root.ownerDocument.createElement("div");
    layerElement.setAttribute(MAINZ_PORTAL_LAYER_ATTR, layer);
    layerElement.setAttribute(MAINZ_MANAGED_PORTAL_LAYER_ATTR, "true");
    root.appendChild(layerElement);
    return layerElement;
}

function ensureDocumentPortalLayer(
    ownerDocument: Document,
    layer: PortalLayer,
): HTMLElement | undefined {
    if (!ownerDocument.body) {
        return undefined;
    }

    const existingLayer = Array.from(
        ownerDocument.body.querySelectorAll<HTMLElement>(`[${MAINZ_DOCUMENT_PORTAL_LAYER_ATTR}]`),
    ).find((element) => element.getAttribute(MAINZ_DOCUMENT_PORTAL_LAYER_ATTR) === layer);

    if (existingLayer) {
        return existingLayer;
    }

    const layerElement = ownerDocument.createElement("div");
    layerElement.setAttribute(MAINZ_DOCUMENT_PORTAL_LAYER_ATTR, layer);
    layerElement.setAttribute(MAINZ_MANAGED_PORTAL_LAYER_ATTR, "true");
    ownerDocument.body.appendChild(layerElement);
    return layerElement;
}

function findPortalLayer(root: HTMLElement, layer: PortalLayer): HTMLElement | undefined {
    return Array.from(
        root.querySelectorAll<HTMLElement>(`[${MAINZ_PORTAL_LAYER_ATTR}]`),
    ).find((element) =>
        element.getAttribute(MAINZ_PORTAL_LAYER_ATTR) === layer &&
        findNearestMainzAppRoot(element) === root
    );
}

function findManagedPortalLayers(root: HTMLElement): HTMLElement[] {
    return Array.from(
        root.querySelectorAll<HTMLElement>(`[${MAINZ_MANAGED_PORTAL_LAYER_ATTR}="true"]`),
    ).filter((element) => findNearestMainzAppRoot(element) === root);
}

function findNearestMainzAppRoot(element: Element): HTMLElement | undefined {
    const appRoot = element.closest<HTMLElement>(`[${MAINZ_APP_ROOT_ATTR}]`);
    return appRoot ?? undefined;
}

function resolvePortalOwnerDocument(): Document {
    const owner = getCurrentRenderOwner() as { ownerDocument?: Document | null } | undefined;
    if (owner?.ownerDocument) {
        return owner.ownerDocument;
    }

    if (typeof document !== "undefined") {
        return document;
    }

    throw new Error("Mainz Portal rendering requires an owner document.");
}

function appendPortalChildren(
    parent: DocumentFragment,
    children: unknown,
    ownerDocument: Document,
): void {
    const flattenedChildren = (Array.isArray(children) ? children : [children]).flat(Infinity);

    for (const child of flattenedChildren) {
        if (child == null || typeof child === "boolean") {
            continue;
        }

        if (isDocumentFragmentLike(child, ownerDocument)) {
            parent.append(...Array.from(child.childNodes));
            continue;
        }

        parent.append(
            isNodeLike(child, ownerDocument) ? child : ownerDocument.createTextNode(String(child)),
        );
    }
}
