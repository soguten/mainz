import {
    elementTagName,
    isDocumentFragmentLike,
    isElementNodeLike,
    isElementLike,
} from "./component-dom.ts";

export function toRenderedNodes(
    rendered: HTMLElement | DocumentFragment,
    ownerDocument: Document,
): Node[] {
    if (isDocumentFragmentLike(rendered, ownerDocument)) {
        return Array.from(rendered.childNodes);
    }

    return [rendered];
}

export function patchChildNodeList(args: {
    parent: Element;
    currentChildren: Node[];
    nextChildren: Node[];
    getNodeKey: (node: Node) => string | null;
    buildNodeLookupKey: (node: Node, key: string) => string;
    patchNode: (current: Node, next: Node) => Node;
}): Node[] {
    const managedStartIndex = findManagedChildStartIndex(
        args.parent,
        args.currentChildren,
    );
    const keyedCurrent = new Map<string, Node>();
    const unkeyedCurrent: Node[] = [];

    for (const child of args.currentChildren) {
        const key = args.getNodeKey(child);
        if (key == null) {
            unkeyedCurrent.push(child);
            continue;
        }

        keyedCurrent.set(args.buildNodeLookupKey(child, key), child);
    }

    const usedCurrent = new Set<Node>();
    const orderedChildren: Node[] = [];

    for (const nextChild of args.nextChildren) {
        const reusableChild = findReusableChild({
            nextChild,
            keyedCurrent,
            unkeyedCurrent,
            usedCurrent,
            getNodeKey: args.getNodeKey,
            buildNodeLookupKey: args.buildNodeLookupKey,
        });

        if (reusableChild) {
            usedCurrent.add(reusableChild);
            orderedChildren.push(args.patchNode(reusableChild, nextChild));
            continue;
        }

        orderedChildren.push(nextChild);
    }

    for (let index = 0; index < orderedChildren.length; index += 1) {
        const expectedNode = orderedChildren[index];
        const currentNodeAtIndex = args.parent.childNodes[managedStartIndex + index];

        if (currentNodeAtIndex !== expectedNode) {
            args.parent.insertBefore(expectedNode, currentNodeAtIndex ?? null);
        }
    }

    const orderedChildrenSet = new Set(orderedChildren);
    for (const currentChild of args.currentChildren) {
        if (
            !orderedChildrenSet.has(currentChild) &&
            currentChild.parentNode === args.parent
        ) {
            args.parent.removeChild(currentChild);
        }
    }

    return orderedChildren;
}

export function syncAttributes(current: Element, next: Element): void {
    for (const attr of Array.from(current.attributes)) {
        if (!next.hasAttribute(attr.name)) {
            current.removeAttribute(attr.name);
        }
    }

    for (const attr of Array.from(next.attributes)) {
        if (current.getAttribute(attr.name) !== attr.value) {
            current.setAttribute(attr.name, attr.value);
        }
    }
}

export function syncProperties(
    current: Element,
    next: Element,
    ownerDocument: Document,
): void {
    const ownerWindow = ownerDocument.defaultView;
    const inputCtor = ownerWindow?.HTMLInputElement;
    const textAreaCtor = ownerWindow?.HTMLTextAreaElement;
    const selectCtor = ownerWindow?.HTMLSelectElement;

    if (
        inputCtor &&
        current instanceof inputCtor &&
        next instanceof inputCtor
    ) {
        if (current.value !== next.value) {
            current.value = next.value;
        }

        if (current.checked !== next.checked) {
            current.checked = next.checked;
        }

        return;
    }

    if (
        textAreaCtor &&
        current instanceof textAreaCtor &&
        next instanceof textAreaCtor
    ) {
        if (current.value !== next.value) {
            current.value = next.value;
        }
        return;
    }

    if (
        selectCtor &&
        current instanceof selectCtor &&
        next instanceof selectCtor
    ) {
        if (current.value !== next.value) {
            current.value = next.value;
        }
        return;
    }

    if (current.tagName === "OPTION" && next.tagName === "OPTION") {
        const currentOption = current as HTMLOptionElement;
        const nextOption = next as HTMLOptionElement;
        if (currentOption.selected !== nextOption.selected) {
            currentOption.selected = nextOption.selected;
        }
    }
}

export function getNodeKey(node: Node, ownerDocument: Document): string | null {
    if (!isElementLike(node, ownerDocument)) {
        return null;
    }

    return node.getAttribute("key") ??
        node.getAttribute("data-key") ??
        node.getAttribute("data-id");
}

export function buildNodeLookupKey(
    node: Node,
    key: string,
    ownerDocument: Document,
): string {
    const elementTag = isElementLike(node, ownerDocument)
        ? elementTagName(node)
        : "node";
    return `${node.nodeType}:${elementTag}:${key}`;
}

export function isSameNodeType(
    current: Node,
    next: Node,
    ownerDocument: Document,
): boolean {
    if (current.nodeType !== next.nodeType) {
        return false;
    }

    if (
        isElementNodeLike(current, ownerDocument) &&
        isElementNodeLike(next, ownerDocument)
    ) {
        return current.namespaceURI === next.namespaceURI &&
            elementTagName(current) === elementTagName(next);
    }

    return true;
}

function findManagedChildStartIndex(
    parent: Element,
    currentChildren: Node[],
): number {
    for (const currentChild of currentChildren) {
        if (currentChild.parentNode !== parent) {
            continue;
        }

        const childIndex = Array.from(parent.childNodes).findIndex((node) =>
            node === currentChild
        );
        if (childIndex >= 0) {
            return childIndex;
        }
    }

    return parent.childNodes.length;
}

function findReusableChild(args: {
    nextChild: Node;
    keyedCurrent: Map<string, Node>;
    unkeyedCurrent: Node[];
    usedCurrent: Set<Node>;
    getNodeKey: (node: Node) => string | null;
    buildNodeLookupKey: (node: Node, key: string) => string;
}): Node | undefined {
    const key = args.getNodeKey(args.nextChild);
    if (key != null) {
        const candidate = args.keyedCurrent.get(
            args.buildNodeLookupKey(args.nextChild, key),
        );
        if (candidate && !args.usedCurrent.has(candidate)) {
            return candidate;
        }

        return undefined;
    }

    for (const candidate of args.unkeyedCurrent) {
        if (args.usedCurrent.has(candidate)) {
            continue;
        }

        return candidate;
    }

    return undefined;
}
