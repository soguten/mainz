import { Component } from "../components";
import { getCurrentRenderOwner } from "./render-owner.ts";

export interface ManagedDOMEventDescriptor {
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean;
}

const MANAGED_DOM_EVENTS = Symbol.for("mainz.managedDomEvents");

type ManagedEventsElement = HTMLElement & {
    [MANAGED_DOM_EVENTS]?: ManagedDOMEventDescriptor[];
};

// deno-lint-ignore no-explicit-any
export function h(tag: any, props: Record<string, any> | null, ...children: any[]) {
    let normalizedChildren: any;
    if (children.length === 0) normalizedChildren = undefined;
    else if (children.length === 1) normalizedChildren = children[0];
    else normalizedChildren = children;

    if (typeof tag === "function") {
        if (tag.prototype instanceof Component) {
            const tagName = tag.getTagName();

            if (!customElements.get(tagName)) {
                customElements.define(tagName, tag);
            }

            const el = document.createElement(tagName) as HTMLElement;

            if (props) {
                applyAttributes(el, props);
            }

            (el as any).props = {
                ...(props ?? {}),
                children: normalizedChildren,
            };

            return el;
        }

        return tag({ ...(props ?? {}), children: normalizedChildren });
    }

    const el =
        typeof tag === "string" &&
            new Set([
                "svg",
                "path",
                "circle",
                "rect",
                "line",
                "polyline",
                "polygon",
                "g",
                "text",
                "defs",
                "linearGradient",
                "stop",
            ]).has(tag)
            ? document.createElementNS("http://www.w3.org/2000/svg", tag)
            : document.createElement(tag);

    if (props) {
        applyAttributes(el, props);
    }

    appendChildren(el, children);
    return el;
}

export function getManagedDOMEvents(node: Node): ManagedDOMEventDescriptor[] {
    if (!(node instanceof HTMLElement)) return [];
    const element = node as ManagedEventsElement;
    return [...(element[MANAGED_DOM_EVENTS] ?? [])];
}

export function setManagedDOMEvents(node: Node, events: ManagedDOMEventDescriptor[]): void {
    if (!(node instanceof HTMLElement)) return;
    const element = node as ManagedEventsElement;

    if (events.length === 0) {
        delete element[MANAGED_DOM_EVENTS];
        return;
    }

    element[MANAGED_DOM_EVENTS] = [...events];
}

// deno-lint-ignore no-explicit-any
export function Fragment(props: { children?: any[] }) {
    const frag = document.createDocumentFragment();
    appendChildren(frag, props.children || []);
    return frag;
}

// deno-lint-ignore no-explicit-any
function appendChildren(parent: HTMLElement | DocumentFragment, kids: any) {
    const flattenedChildren = (Array.isArray(kids) ? kids : [kids]).flat(Infinity);

    for (const child of flattenedChildren) {
        if (child == null || typeof child === "boolean") continue;
        parent.append(
            child instanceof Node ? child : document.createTextNode(String(child)),
        );
    }
}

function applyAttributes(el: HTMLElement, props: Record<string, any>) {
    const owner = getCurrentRenderOwner();

    for (const [key, value] of Object.entries(props)) {
        if (key === "ref" && typeof value === "function") {
            value(el);
        } else if (key === "className") {
            el.setAttribute("class", value);
        } else if (key === "value") {
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
                el.value = value == null ? "" : String(value);
            } else if (value != null) {
                el.setAttribute(key, String(value));
            }
        } else if (key === "checked") {
            if (el instanceof HTMLInputElement) {
                el.checked = Boolean(value);
            } else if (value != null) {
                el.setAttribute(key, String(value));
            }
        } else if (key === "selected") {
            if (el instanceof HTMLOptionElement) {
                el.selected = Boolean(value);
            } else if (value != null) {
                el.setAttribute(key, String(value));
            }
        } else if (key.startsWith("on") && typeof value === "function") {
            const eventType = key.slice(2).toLowerCase();
            const descriptors = getManagedDOMEvents(el).filter((event) => event.type !== eventType);
            descriptors.push({
                type: eventType,
                listener: value,
            });
            setManagedDOMEvents(el, descriptors);

            if (owner) {
                owner.registerDOMEvent(el, eventType, value);
            } else {
                el.addEventListener(eventType, value);
            }
        } else if (key !== "children" && value != null) {
            if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
            ) {
                el.setAttribute(key, String(value));
            }
        }
    }
}
