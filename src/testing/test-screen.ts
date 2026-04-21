/** Minimal DOM testing facade returned by Mainz component render helpers. */
export type TestScreen<TComponent extends Element = HTMLElement> = {
    /** Root rendered component instance. */
    component: TComponent;
    /** Host container created for the rendered component. */
    host: HTMLElement;
    /** Alias for the host container used by the test helpers. */
    container: HTMLElement;
    /** Returns the first matching element or throws when none is found. */
    getBySelector<E extends Element = Element>(selector: string): E;
    /** Returns the first matching element or `null` when none is found. */
    queryBySelector<E extends Element = Element>(selector: string): E | null;
    /** Clicks the first matching element. */
    click(selector: string): void;
    /** Dispatches a custom event on the first matching element. */
    dispatch(selector: string, event: Event): void;
    /** Updates an input-like element and dispatches an `input` event. */
    input(selector: string, value: string): void;
    /** Updates an input-like element and dispatches a `change` event. */
    change(selector: string, value: string): void;
    /** Removes the rendered host container and runs optional custom cleanup. */
    cleanup(): void;
};

/** Creates a `TestScreen` facade around a rendered Mainz component instance. */
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
