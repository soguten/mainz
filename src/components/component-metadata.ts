import type { RenderPolicy, RenderStrategy } from "../resources/resource.ts";

export interface ComponentRenderConfig {
    strategy: RenderStrategy;
    policy?: RenderPolicy;
    hasExplicitStrategy: boolean;
    hasExplicitPolicy: boolean;
}

type MainzComponentConstructor = (abstract new (...args: unknown[]) => object) & {
    name: string;
    [COMPONENT_CUSTOM_ELEMENT_TAG]?: string;
    [COMPONENT_RENDER_STRATEGY]?: RenderStrategy;
    [COMPONENT_RENDER_POLICY]?: RenderPolicy;
};

const COMPONENT_CUSTOM_ELEMENT_TAG = Symbol(
    "mainz.component.custom-element-tag",
);
const COMPONENT_RENDER_STRATEGY = Symbol(
    "mainz.component.render-strategy",
);
const COMPONENT_RENDER_POLICY = Symbol(
    "mainz.component.render-policy",
);
type MainzComponentDecorator = <T extends MainzComponentConstructor>(
    value: T,
    _context?: ClassDecoratorContext<T>,
) => void;

/**
 * Declares the custom element tag name for a Mainz component class.
 *
 * Use `@CustomElement(...)` when the component needs a stable public tag name in rendered output
 * or direct DOM usage.
 */
export function CustomElement(tagName: string): MainzComponentDecorator {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedCustomElementTag(value, tagName);
    };
}

/**
 * Declares when a component participates in rendering.
 *
 * `@RenderStrategy(...)` controls timing only.
 * Use:
 *
 * - `"blocking"` when the component should render normally
 * - `"defer"` when the component may show `placeholder()` before rendering its final content
 *
 * When no explicit strategy is declared, Mainz may infer the strategy from the component shape.
 */
export function RenderStrategy(
    strategy: RenderStrategy,
): MainzComponentDecorator {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedRenderStrategy(value, strategy);
    };
}

/**
 * Declares how a component behaves during SSG build.
 *
 * `@RenderPolicy(...)` controls SSG behavior only.
 * Use:
 *
 * - `"placeholder-in-ssg"` to emit `placeholder()` output during SSG
 * - `"hide-in-ssg"` to omit the component's output during SSG
 * - `"forbidden-in-ssg"` to reject SSG usage entirely
 */
export function RenderPolicy(
    policy: RenderPolicy,
): MainzComponentDecorator {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedRenderPolicy(value, policy);
    };
}

export function resolveDecoratedCustomElementTag(
    componentCtor: object,
): string | undefined {
    const tagName = (componentCtor as {
        [COMPONENT_CUSTOM_ELEMENT_TAG]?: string;
    })[COMPONENT_CUSTOM_ELEMENT_TAG]?.trim();
    return tagName ? tagName : undefined;
}

export function resolveComponentRenderStrategy(
    componentCtor: object,
): RenderStrategy | undefined {
    return resolveComponentRenderConfig(componentCtor)?.strategy;
}

export function resolveComponentRenderPolicy(
    componentCtor: object,
): RenderPolicy | undefined {
    return resolveComponentRenderConfig(componentCtor)?.policy;
}

export function resolveComponentRenderConfig(
    componentCtor: object,
): ComponentRenderConfig | undefined {
    const componentOwner = componentCtor as {
        [COMPONENT_RENDER_STRATEGY]?: RenderStrategy;
        [COMPONENT_RENDER_POLICY]?: RenderPolicy;
    };
    const candidate = componentCtor as {
        prototype?: {
            load?: unknown;
            placeholder?: unknown;
        };
    };
    const hasLoad = typeof candidate.prototype?.load === "function";
    const hasPlaceholder = typeof candidate.prototype?.placeholder === "function";
    const explicitStrategy = componentOwner[COMPONENT_RENDER_STRATEGY];
    const explicitPolicy = componentOwner[COMPONENT_RENDER_POLICY];

    return {
        strategy: explicitStrategy ?? (hasLoad && hasPlaceholder ? "defer" : "blocking"),
        policy: explicitPolicy,
        hasExplicitStrategy: explicitStrategy !== undefined,
        hasExplicitPolicy: explicitPolicy !== undefined,
    };
}

function applyDecoratedCustomElementTag(
    ctor: MainzComponentConstructor,
    tagName: string,
): void {
    ctor[COMPONENT_CUSTOM_ELEMENT_TAG] = tagName;
}

function applyDecoratedRenderStrategy(
    ctor: MainzComponentConstructor,
    strategy: RenderStrategy,
): void {
    ctor[COMPONENT_RENDER_STRATEGY] = strategy;
}

function applyDecoratedRenderPolicy(
    ctor: MainzComponentConstructor,
    policy: RenderPolicy,
): void {
    ctor[COMPONENT_RENDER_POLICY] = policy;
}
