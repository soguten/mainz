export function normalizeComponentRenderValue(
    value: unknown,
    ownerDocument = resolveOwnerDocument(value),
): HTMLElement | DocumentFragment {
    if (ownerDocument && isDocumentFragmentLike(value, ownerDocument)) {
        return value;
    }

    if (ownerDocument && isHtmlElementLike(value, ownerDocument)) {
        return value;
    }

    if (ownerDocument && isNodeLike(value, ownerDocument)) {
        const fragment = ownerDocument.createDocumentFragment();
        fragment.appendChild(value);
        return fragment;
    }

    if (value == null || value === false) {
        return ownerDocument.createDocumentFragment();
    }

    const textNode = ownerDocument.createTextNode(String(value));
    const fragment = ownerDocument.createDocumentFragment();
    fragment.appendChild(textNode);
    return fragment;
}

export function elementTagName(element: Element): string {
    if (isHtmlElementLike(element, element.ownerDocument)) {
        return element.tagName;
    }

    return element.localName;
}

export function isElementNodeLike(
    value: unknown,
    ownerDocument?: Document,
): value is Element {
    const elementCtor = ownerDocument?.defaultView?.Element;
    return !!elementCtor && value instanceof elementCtor;
}

export function resolveOwnerDocument(value: unknown): Document {
    const fromOwner = (value as { ownerDocument?: Document | null } | null | undefined)
        ?.ownerDocument;
    if (fromOwner) {
        return fromOwner;
    }

    if (typeof document !== "undefined") {
        return document;
    }

    throw new Error("Mainz component rendering requires an owner document.");
}

export function isNodeLike(value: unknown, ownerDocument?: Document): value is Node {
    const nodeCtor = ownerDocument?.defaultView?.Node;
    return !!nodeCtor && value instanceof nodeCtor;
}

export function isElementLike(value: unknown, ownerDocument?: Document): value is Element {
    return isElementNodeLike(value, ownerDocument);
}

export function isHtmlElementLike(
    value: unknown,
    ownerDocument?: Document,
): value is HTMLElement {
    const htmlElementCtor = ownerDocument?.defaultView?.HTMLElement;
    return !!htmlElementCtor && value instanceof htmlElementCtor;
}

export function isDocumentFragmentLike(
    value: unknown,
    ownerDocument?: Document,
): value is DocumentFragment {
    const fragmentCtor = ownerDocument?.defaultView?.DocumentFragment;
    return !!fragmentCtor && value instanceof fragmentCtor;
}
