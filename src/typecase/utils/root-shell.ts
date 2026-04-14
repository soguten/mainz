export function getTypecaseRootShellProps(host: Element): Record<string, string> {
    const root = host.closest(".typecase-root");

    if (!isHTMLElement(root)) {
        return {
            className: "typecase-root",
        };
    }

    return {
        className: "typecase-root",
        "data-typecase-theme": root.getAttribute("data-typecase-theme") ?? "",
        "data-typecase-theme-available": root.getAttribute("data-typecase-theme-available") ?? "",
        "data-typecase-theme-preference": root.getAttribute("data-typecase-theme-preference") ??
            "",
        "data-typecase-theme-scheme": root.getAttribute("data-typecase-theme-scheme") ?? "",
        style: root.getAttribute("style") ?? "",
    };
}

function isHTMLElement(value: Element | null): value is HTMLElement {
    if (!value) {
        return false;
    }

    const elementCtor = value.ownerDocument.defaultView?.HTMLElement;
    return elementCtor ? value instanceof elementCtor : value.nodeType === 1;
}
