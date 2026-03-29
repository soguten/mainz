import type { ComponentRenderConfig } from "./component-metadata.ts";

const warnedMissingLoadFallbackComponents = new WeakSet<object>();

export function warnAboutMissingLoadFallback(
    componentCtor: object,
    renderConfig: ComponentRenderConfig,
): void {
    if (renderConfig.strategy !== "deferred" && renderConfig.strategy !== "client-only") {
        return;
    }

    if (
        renderConfig.fallback !== undefined ||
        warnedMissingLoadFallbackComponents.has(componentCtor)
    ) {
        return;
    }

    const componentName = resolveComponentName(componentCtor);
    console.warn(
        `Component "${componentName}" uses @RenderStrategy("${renderConfig.strategy}") without a fallback. ` +
            "Add a fallback to make the component's async placeholder explicit.",
    );
    warnedMissingLoadFallbackComponents.add(componentCtor);
}

function resolveComponentName(componentCtor: object): string {
    const candidate = componentCtor as { name?: string };
    return candidate.name || "AnonymousComponent";
}
