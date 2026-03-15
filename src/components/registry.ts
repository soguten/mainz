type MainzCustomElementConstructor = CustomElementConstructor & {
    getTagName(): string;
};

export function ensureMainzCustomElementDefined(ctor: MainzCustomElementConstructor): string {
    const tagName = ctor.getTagName();

    if (!customElements.get(tagName)) {
        customElements.define(tagName, ctor);
    }

    return tagName;
}
