import { DefaultProps, DefaultState } from "./types.js";

/**
 * Abstract base class for custom web components.
 * Provides lifecycle management, state handling, event registration, and rendering logic.
 * 
 * @template P The type for the component's props.
 * @template S The type for the component's state.
 */
export abstract class Component<P = DefaultProps, S = DefaultState> extends HTMLElement {

    private static tagNameCache = new WeakMap<typeof Component, string>();
    private static tagOwners = new Map<string, typeof Component>();
    private static tagSuffixCounter = 0;

    /** The properties of the component */
    props: P = {} as P;

    /** The state of the component */
    state: S = {} as S;


    // shadow = this.attachShadow({ mode: 'open' });

    /** Stores registered event listeners for cleanup */
    private eventListeners: Array<[EventTarget, string, EventListenerOrEventListenerObject, boolean?]> = [];

    /**
     * Called when the component is added to the DOM.
     * Renders the component and triggers the `onMount` lifecycle method, if defined.
     */
    connectedCallback() {
        this.renderDOM();
        this.onMount?.();
    }

    /**
     * Called when the component is removed from the DOM.
     * Removes event listeners and triggers the `onUnmount` lifecycle method, if defined.
     */
    disconnectedCallback() {
        this.onUnmount?.();
        for (const [target, type, listener, options] of this.eventListeners) {
            target.removeEventListener(type, listener, options);
        }
        this.eventListeners = [];
    }

    /**
     * Updates the component state and re-renders it.
     * @param partial The partial state to merge with the current state.
     */
    public setState(partial: Partial<S>) {
        const nextState = { ...this.state, ...partial };
        this.state = nextState;
        this.renderDOM();
    }

    /**
     * Registers an event listener for a target element and stores it for future cleanup.
     * @param target The target element to attach the event listener to.
     * @param type The event type (e.g., "click", "keydown").
     * @param listener The event listener function or object.
     * @param options The options for the event listener.
     */
    protected registerEvent(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean) {
        target.addEventListener(type, listener, options);
        this.eventListeners.push([target, type, listener, options]);
    }

    /**
     * Injects styles into the component, using the `styles` static property if defined.
     * Logs a warning if the `styles` property is set as an instance property.
     */
    protected injectStyles() {
        if (Object.prototype.hasOwnProperty.call(this, "styles")) {
            console.warn(`${this.constructor.name} tem 'styles' na instância; use static styles.`);
        }

        const ctor = this.constructor as typeof Component;
        const styles = ctor.styles;
        if (!styles) return;

        const add = (css: string) => {
            const s = document.createElement("style");
            s.textContent = css;
            this.appendChild(s);
        };

        if (typeof styles === "string") {
            add(styles);
        } else {
            styles.forEach(add);
        }
    }

    /**
    * Renders the DOM structure of the component.
    * Clears the inner HTML, injects styles, and appends the component's content.
    */
    private renderDOM() {
        this.innerHTML = "";
        this.injectStyles();
        this.appendChild(this.render());
        this.afterRender?.();
    }

    /**
     * Returns the custom tag name for the component in kebab-case.
     * @returns {string} The tag name of the component.
     */
    static get tagName(): string {
        const ctor = this as typeof Component;
        const cached = Component.tagNameCache.get(ctor);
        if (cached) return cached;

        const normalizedName = Component.toKebabCase(ctor.name)
            .replace(/[^a-z0-9._-]/g, "-")
            .replace(/^-+|-+$/g, "") || "component";

        let candidate = `x-${normalizedName}`;
        const owner = Component.tagOwners.get(candidate);

        if (owner && owner !== ctor) {
            Component.tagSuffixCounter += 1;
            candidate = `${candidate}-${Component.tagSuffixCounter}`;
        }

        Component.tagOwners.set(candidate, ctor);
        Component.tagNameCache.set(ctor, candidate);

        return candidate;
    }

    /**
     * Returns the custom tag name for the component.
     * @returns {string} The tag name of the component.
     */
    static getTagName(): string {
        return this.tagName;
    }

    /**
     * Returns the custom tag name for the current component instance.
     * @returns {string} The tag name of the component.
     */
    getTagName(): string {
        return (this.constructor as typeof Component).tagName;
    }

    /**
     * Abstract method for rendering the component's DOM structure.
     * Must be implemented by subclasses.
     * @returns {HTMLElement} The rendered component element.
     */
    abstract render(): HTMLElement;

    /** Optional lifecycle method called after the component is mounted */
    onMount?(): void;

    /** Optional lifecycle method called before the component is unmounted */
    onUnmount?(): void;

    /** Optional static property to define CSS styles for the component */
    static styles?: string | string[];

    protected static extendStyles(...extra: string[]): string[] {
        const parentClass = Object.getPrototypeOf(this) as typeof Component;
        const parentStyles = parentClass.styles
            ? Array.isArray(parentClass.styles)
                ? parentClass.styles
                : [parentClass.styles]
            : [];
        return [...parentStyles, ...extra];
    }

    afterRender?(): void;

    private static toKebabCase(str: string): string {
        return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }
}