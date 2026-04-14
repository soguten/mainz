import type { PopoverAlign, PopoverPlacement } from "../composites/index.ts";

export interface FloatingStyleOptions {
    align?: PopoverAlign;
    anchor: HTMLElement;
    offset?: number;
    placement?: PopoverPlacement;
}

export function getAnchoredFloatingStyle(options: FloatingStyleOptions): string {
    const placement = options.placement ?? "bottom";
    const align = options.align ?? "center";
    const rect = options.anchor.getBoundingClientRect();
    const viewportWidth = options.anchor.ownerDocument.defaultView?.innerWidth ?? rect.right;
    const viewportHeight = options.anchor.ownerDocument.defaultView?.innerHeight ?? rect.bottom;
    const offset = options.offset ?? 8;
    const style: string[] = [];

    if (placement === "top") {
        style.push(`bottom: ${Math.max(viewportHeight - rect.top + offset, 0)}px;`);
        style.push(...getHorizontalStyle(rect, viewportWidth, align));
    } else if (placement === "left") {
        style.push(`right: ${Math.max(viewportWidth - rect.left + offset, 0)}px;`);
        style.push(...getVerticalStyle(rect, viewportHeight, align));
    } else if (placement === "right") {
        style.push(`left: ${rect.right + offset}px;`);
        style.push(...getVerticalStyle(rect, viewportHeight, align));
    } else {
        style.push(`top: ${rect.bottom + offset}px;`);
        style.push(...getHorizontalStyle(rect, viewportWidth, align));
    }

    return style.join(" ");
}

function getHorizontalStyle(
    rect: DOMRect,
    viewportWidth: number,
    align: PopoverAlign,
): string[] {
    if (align === "start") {
        return [`left: ${rect.left}px;`];
    }

    if (align === "end") {
        return [`right: ${Math.max(viewportWidth - rect.right, 0)}px;`];
    }

    return [`left: ${rect.left + rect.width / 2}px;`, "transform: translateX(-50%);"];
}

function getVerticalStyle(
    rect: DOMRect,
    viewportHeight: number,
    align: PopoverAlign,
): string[] {
    if (align === "start") {
        return [`top: ${rect.top}px;`];
    }

    if (align === "end") {
        return [`bottom: ${Math.max(viewportHeight - rect.bottom, 0)}px;`];
    }

    return [`top: ${rect.top + rect.height / 2}px;`, "transform: translateY(-50%);"];
}
