import type { ComponentRenderConfig } from "./component-metadata.ts";

const warnedMissingLoadPlaceholderComponents = new WeakSet<object>();

export function warnAboutMissingLoadPlaceholder(
  componentCtor: object,
  renderConfig: ComponentRenderConfig,
): void {
  if (renderConfig.strategy !== "defer") {
    return;
  }

  if (
    typeof (componentCtor as { prototype?: { placeholder?: unknown } })
        .prototype?.placeholder ===
      "function" ||
    warnedMissingLoadPlaceholderComponents.has(componentCtor)
  ) {
    return;
  }

  const componentName = resolveComponentName(componentCtor);
  console.warn(
    `Component "${componentName}" uses @RenderStrategy("${renderConfig.strategy}") without a placeholder(). ` +
      "Add placeholder() to make the component's async placeholder explicit.",
  );
  warnedMissingLoadPlaceholderComponents.add(componentCtor);
}

function resolveComponentName(componentCtor: object): string {
  const candidate = componentCtor as { name?: string };
  return candidate.name || "AnonymousComponent";
}
