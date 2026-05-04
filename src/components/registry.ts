import { ensureComponentElementBaseHydrated } from "./component.ts";

/**
 * Defines the Mainz custom element for a component constructor when it has not been registered
 * yet, and returns the final tag name.
 */
export function ensureMainzCustomElementDefined(
    ctor: CustomElementConstructor & { getTagName(): string },
): string {
    ensureComponentElementBaseHydrated();
    const tagName = ctor.getTagName();

    if (!customElements.get(tagName)) {
        customElements.define(tagName, ctor);
    }

    return tagName;
}
