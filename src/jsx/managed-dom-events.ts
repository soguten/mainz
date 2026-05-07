export interface ManagedDOMEventDescriptor {
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean;
}

const MANAGED_DOM_EVENTS = Symbol.for("mainz.managedDomEvents");

type ManagedEventsElement = Element & {
  [MANAGED_DOM_EVENTS]?: ManagedDOMEventDescriptor[];
};

export function getManagedDOMEvents(node: Node): ManagedDOMEventDescriptor[] {
  if (!isElementNode(node)) return [];
  const element = node as ManagedEventsElement;
  return [...(element[MANAGED_DOM_EVENTS] ?? [])];
}

export function setManagedDOMEvents(
  node: Node,
  events: ManagedDOMEventDescriptor[],
): void {
  if (!isElementNode(node)) return;
  const element = node as ManagedEventsElement;

  if (events.length === 0) {
    delete element[MANAGED_DOM_EVENTS];
    return;
  }

  element[MANAGED_DOM_EVENTS] = [...events];
}

function isElementNode(value: unknown): value is Element {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ownerDocument = "ownerDocument" in value
    ? (value as { ownerDocument?: Document | null }).ownerDocument
    : undefined;
  const ownerWindow = ownerDocument?.defaultView;
  const ownerElement = ownerWindow?.Element;

  return ownerElement ? value instanceof ownerElement : false;
}
