import { Component } from "../components/component.ts";
import { ensureMainzCustomElementDefined } from "../components/registry.ts";
import {
  getManagedDOMEvents,
  setManagedDOMEvents,
} from "./managed-dom-events.ts";
import { getCurrentRenderOwner } from "./render-owner.ts";

export {
  getManagedDOMEvents,
  type ManagedDOMEventDescriptor,
  setManagedDOMEvents,
} from "./managed-dom-events.ts";

// deno-lint-ignore no-explicit-any
export function h(
  tag: any,
  props: Record<string, any> | null,
  ...children: any[]
) {
  const ownerDocument = resolveCurrentRenderDocument();

  let normalizedChildren: any;
  if (children.length === 0) normalizedChildren = undefined;
  else if (children.length === 1) normalizedChildren = children[0];
  else normalizedChildren = children;

  if (typeof tag === "function") {
    if (tag.prototype instanceof Component) {
      const tagName = ensureMainzCustomElementDefined(tag);

      const el = ownerDocument.createElement(tagName) as HTMLElement;

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

  const el = typeof tag === "string" &&
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
    ? ownerDocument.createElementNS("http://www.w3.org/2000/svg", tag)
    : ownerDocument.createElement(tag);

  if (props) {
    applyAttributes(el, props);
  }

  appendChildren(el, children);
  return el;
}

// deno-lint-ignore no-explicit-any
export function Fragment(props: { children?: any[] }): DocumentFragment {
  const frag = resolveCurrentRenderDocument().createDocumentFragment();
  appendChildren(frag, props.children || []);
  return frag;
}

// deno-lint-ignore no-explicit-any
function appendChildren(parent: Element | DocumentFragment, kids: any) {
  const ownerDocument = parent.ownerDocument ?? resolveCurrentRenderDocument();
  const flattenedChildren = (Array.isArray(kids) ? kids : [kids]).flat(
    Infinity,
  );

  for (const child of flattenedChildren) {
    if (child == null || typeof child === "boolean") continue;
    parent.append(
      isNodeLike(child, ownerDocument)
        ? child
        : ownerDocument.createTextNode(String(child)),
    );
  }
}

function applyAttributes(el: Element, props: Record<string, any>) {
  const owner = getCurrentRenderOwner();
  const ownerWindow = el.ownerDocument.defaultView;
  const inputCtor = ownerWindow?.HTMLInputElement;
  const textAreaCtor = ownerWindow?.HTMLTextAreaElement;
  const selectCtor = ownerWindow?.HTMLSelectElement;
  const optionCtor = ownerWindow?.HTMLOptionElement;

  for (const [key, value] of Object.entries(props)) {
    if (key === "ref" && typeof value === "function") {
      value(el);
    } else if (key === "className") {
      el.setAttribute("class", value);
    } else if (key === "value") {
      if (
        (inputCtor && el instanceof inputCtor) ||
        (textAreaCtor && el instanceof textAreaCtor) ||
        (selectCtor && el instanceof selectCtor)
      ) {
        (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
          .value = value == null ? "" : String(value);
      } else if (value != null) {
        el.setAttribute(key, String(value));
      }
    } else if (key === "checked") {
      if (inputCtor && el instanceof inputCtor) {
        (el as HTMLInputElement).checked = Boolean(value);
      } else if (value != null) {
        el.setAttribute(key, String(value));
      }
    } else if (key === "selected") {
      if (optionCtor && el instanceof optionCtor) {
        (el as HTMLOptionElement).selected = Boolean(value);
      } else if (value != null) {
        el.setAttribute(key, String(value));
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      const eventType = key.slice(2).toLowerCase();
      const descriptors = getManagedDOMEvents(el).filter((event) =>
        event.type !== eventType
      );
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

function resolveCurrentRenderDocument(): Document {
  const owner = getCurrentRenderOwner();
  const ownerDocument =
    (owner as { ownerDocument?: Document | null } | undefined)?.ownerDocument;
  if (ownerDocument) {
    return ownerDocument;
  }

  if (typeof document !== "undefined") {
    return document;
  }

  throw new Error("Mainz JSX rendering requires an owner document.");
}

function isNodeLike(value: unknown, ownerDocument: Document): value is Node {
  const ownerNode = ownerDocument.defaultView?.Node;
  if (!!ownerNode && value instanceof ownerNode) {
    return true;
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    nodeType?: unknown;
    nodeName?: unknown;
    ownerDocument?: unknown;
  };

  return typeof candidate.nodeType === "number" &&
    typeof candidate.nodeName === "string" &&
    typeof candidate.ownerDocument === "object" &&
    candidate.ownerDocument !== null;
}
