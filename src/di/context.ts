import type { ServiceContainer } from "./container.ts";

const SERVICE_CONTAINER_STACK: ServiceContainer[] = [];
const SERVICE_CONTAINERS = new WeakMap<object, ServiceContainer>();
const INJECT_REFERENCE_SET_OWNER = Symbol.for("mainz.di.inject-ref.set-owner");
const INJECT_REFERENCE_CLONE = Symbol.for("mainz.di.inject-ref.clone");

export function attachServiceContainer<T extends object>(
    target: T,
    container: ServiceContainer | undefined,
): T {
    if (!container) {
        return target;
    }

    SERVICE_CONTAINERS.set(target, container);
    bindInjectReferencesToOwner(target);
    return target;
}

export function readServiceContainer(target: object | null | undefined): ServiceContainer | undefined {
    if (!target) {
        return undefined;
    }

    return SERVICE_CONTAINERS.get(target);
}

export function getCurrentServiceContainer(): ServiceContainer | undefined {
    return SERVICE_CONTAINER_STACK.at(-1);
}

export function pushCurrentServiceContainer(container: ServiceContainer | undefined): void {
    if (!container) {
        return;
    }

    SERVICE_CONTAINER_STACK.push(container);
}

export function popCurrentServiceContainer(): void {
    if (SERVICE_CONTAINER_STACK.length === 0) {
        return;
    }

    SERVICE_CONTAINER_STACK.pop();
}

export function withServiceContainer<Value>(
    container: ServiceContainer | undefined,
    action: () => Value,
): Value {
    if (!container) {
        return action();
    }

    pushCurrentServiceContainer(container);

    let shouldPopSynchronously = true;
    try {
        const result = action();
        if (isPromiseLike(result)) {
            shouldPopSynchronously = false;
            return Promise.resolve(result).finally(() => {
                popCurrentServiceContainer();
            }) as Value;
        }

        return result;
    } finally {
        if (shouldPopSynchronously) {
            popCurrentServiceContainer();
        }
    }
}

function isPromiseLike<T>(value: T): value is T & PromiseLike<unknown> {
    return typeof (value as PromiseLike<unknown> | undefined)?.then === "function";
}

function bindInjectReferencesToOwner(target: object): void {
    for (const entry of enumerateInjectableDescriptors(target)) {
        const { holder, propertyKey, descriptor } = entry;
        const value = descriptor.value;
        if (!value || (typeof value !== "object" && typeof value !== "function")) {
            continue;
        }

        const candidate = holder === target
            ? value
            : cloneInheritedInjectReference(value, descriptor, target, propertyKey);
        if (!candidate) {
            continue;
        }

        const bindOwner = (candidate as Record<PropertyKey, unknown>)[INJECT_REFERENCE_SET_OWNER];
        if (typeof bindOwner === "function") {
            bindOwner(target);
        }
    }
}

function* enumerateInjectableDescriptors(
    target: object,
): Iterable<{ holder: object; propertyKey: PropertyKey; descriptor: PropertyDescriptor & { value: unknown } }> {
    let current: object | null = target;
    const seenKeys = new Set<PropertyKey>();

    while (current && current !== Object.prototype) {
        for (const propertyKey of [
            ...Object.getOwnPropertyNames(current),
            ...Object.getOwnPropertySymbols(current),
        ]) {
            if (seenKeys.has(propertyKey)) {
                continue;
            }

            seenKeys.add(propertyKey);
            const descriptor = Object.getOwnPropertyDescriptor(current, propertyKey);
            if (!descriptor || !("value" in descriptor)) {
                continue;
            }

            yield {
                holder: current,
                propertyKey,
                descriptor: descriptor as PropertyDescriptor & { value: unknown },
            };
        }

        current = Object.getPrototypeOf(current);
    }
}

function cloneInheritedInjectReference(
    value: unknown,
    descriptor: PropertyDescriptor,
    target: object,
    propertyKey: PropertyKey,
): object | undefined {
    const clone = (value as Record<PropertyKey, unknown>)[INJECT_REFERENCE_CLONE];
    if (typeof clone !== "function") {
        return undefined;
    }

    const clonedValue = clone();
    Object.defineProperty(target, propertyKey, {
        ...descriptor,
        value: clonedValue,
    });
    return clonedValue as object;
}
