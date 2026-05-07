export interface RenderOwner {
  registerDOMEvent(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean,
  ): void;
}

const renderOwnerStack: RenderOwner[] = [];

export function pushRenderOwner(owner: RenderOwner): void {
  renderOwnerStack.push(owner);
}

export function popRenderOwner(): void {
  renderOwnerStack.pop();
}

export function getCurrentRenderOwner(): RenderOwner | undefined {
  return renderOwnerStack[renderOwnerStack.length - 1];
}
