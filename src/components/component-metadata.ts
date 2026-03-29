import type { RenderStrategy } from "../resources/index.ts";

export interface RenderStrategyOptions {
    fallback?: unknown | (() => unknown);
    errorFallback?: unknown | ((error: unknown) => unknown);
}

export interface ComponentRenderConfig extends RenderStrategyOptions {
    strategy: RenderStrategy;
}

type MainzComponentConstructor = (abstract new (...args: unknown[]) => object) & {
    name: string;
    [COMPONENT_CUSTOM_ELEMENT_TAG]?: string;
    [COMPONENT_RENDER_STRATEGY]?: ComponentRenderConfig;
};

const COMPONENT_CUSTOM_ELEMENT_TAG = Symbol(
    "mainz.component.custom-element-tag",
);
const COMPONENT_RENDER_STRATEGY = Symbol(
    "mainz.component.render-strategy",
);

export function CustomElement(tagName: string) {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedCustomElementTag(value, tagName);
    };
}

export function RenderStrategy(
    strategy: RenderStrategy,
    options: RenderStrategyOptions = {},
) {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedRenderStrategy(value, {
            strategy,
            fallback: options.fallback,
            errorFallback: options.errorFallback,
        });
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

export function resolveComponentRenderConfig(
    componentCtor: object,
): ComponentRenderConfig | undefined {
    const componentOwner = componentCtor as {
        [COMPONENT_RENDER_STRATEGY]?: ComponentRenderConfig;
    };
    if (componentOwner[COMPONENT_RENDER_STRATEGY]) {
        return componentOwner[COMPONENT_RENDER_STRATEGY];
    }

    const candidate = componentCtor as { prototype?: { load?: unknown } };
    if (typeof candidate.prototype?.load === "function") {
        return {
            strategy: "blocking",
        };
    }

    return undefined;
}

function applyDecoratedCustomElementTag(
    ctor: MainzComponentConstructor,
    tagName: string,
): void {
    ctor[COMPONENT_CUSTOM_ELEMENT_TAG] = tagName;
}

function applyDecoratedRenderStrategy(
    ctor: MainzComponentConstructor,
    config: ComponentRenderConfig,
): void {
    ctor[COMPONENT_RENDER_STRATEGY] = config;
}
