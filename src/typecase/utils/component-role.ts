const TYPECASE_COMPONENT_ROLES = Symbol.for("typecase.component.roles");

type TypecaseRoleElement = Element & {
    [TYPECASE_COMPONENT_ROLES]?: Set<string>;
};

export function markTypecaseRole<T extends Element>(element: T, role: string): T {
    const roleElement = element as TypecaseRoleElement;

    roleElement[TYPECASE_COMPONENT_ROLES] ??= new Set();
    roleElement[TYPECASE_COMPONENT_ROLES].add(role);

    return element;
}

export function hasTypecaseRole(value: unknown, role: string): boolean {
    if (!isElementLike(value)) {
        return false;
    }

    return (value as TypecaseRoleElement)[TYPECASE_COMPONENT_ROLES]?.has(role) ?? false;
}

export function findTypecaseRoleElements(root: ParentNode, role: string): Element[] {
    return Array.from(root.querySelectorAll("*")).filter((element) =>
        hasTypecaseRole(element, role)
    );
}

function isElementLike(value: unknown): value is Element {
    return !!value && typeof value === "object" &&
        (value as { nodeType?: unknown }).nodeType === 1;
}
