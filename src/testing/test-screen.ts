export type TestScreen<TComponent extends Element = HTMLElement> = {
    component: TComponent;
    host: HTMLElement;
    container: HTMLElement;
    getBySelector<E extends Element = Element>(selector: string): E;
    queryBySelector<E extends Element = Element>(selector: string): E | null;
    click(selector: string): void;
    dispatch(selector: string, event: Event): void;
    input(selector: string, value: string): void;
    change(selector: string, value: string): void;
    cleanup(): void;
};

export function createTestScreen<TComponent extends Element>(
    component: TComponent,
    host: HTMLElement,
    options?: {
        cleanup?: () => void;
    },
): TestScreen<TComponent> {
    const queryBySelector = <E extends Element = Element>(
        selector: string,
    ): E | null => {
        return component.querySelector(selector) as E | null;
    };

    const getBySelector = <E extends Element = Element>(selector: string): E => {
        const node = queryBySelector<E>(selector);
        if (!node) {
            throw new Error(`Expected element for selector: ${selector}`);
        }
        return node;
    };

    const click = (selector: string): void => {
        const node = getBySelector<HTMLElement>(selector);
        node.click();
    };

    const dispatch = (selector: string, event: Event): void => {
        const node = getBySelector<HTMLElement>(selector);
        node.dispatchEvent(event);
    };

    const input = (selector: string, value: string): void => {
        const node = getBySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
        node.value = value;
        node.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const change = (selector: string, value: string): void => {
        const node = getBySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            selector,
        );
        node.value = value;
        node.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const cleanup = (): void => {
        if (options?.cleanup) {
            options.cleanup();
            return;
        }

        const parent = host.parentElement;
        host.remove();

        if (parent?.id === "test-root" && parent.childElementCount === 0) {
            parent.remove();
        }
    };

    return {
        component,
        host,
        container: host,
        getBySelector,
        queryBySelector,
        click,
        dispatch,
        input,
        change,
        cleanup,
    };
}
