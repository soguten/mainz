import {
    getCurrentServiceContainer,
    readServiceContainer,
} from "./context.ts";
import {
    createServiceContainer,
    describeToken,
    DuplicateServiceError,
    MissingServiceError,
    ServiceCycleError,
    singleton,
    transient,
    type ServiceContainer,
    type ServiceFactoryContext,
    type ServiceRegistration,
    type ServiceToken,
} from "./container.ts";

export {
    createServiceContainer,
    DuplicateServiceError,
    MissingServiceError,
    ServiceCycleError,
    singleton,
    transient,
};

export type {
    ServiceContainer,
    ServiceFactoryContext,
    ServiceRegistration,
    ServiceToken,
};

const INJECT_REFERENCE_SET_OWNER = Symbol.for("mainz.di.inject-ref.set-owner");
const INJECT_REFERENCE_CLONE = Symbol.for("mainz.di.inject-ref.clone");
const injectedReferenceOwners = new WeakMap<object, object>();

export function inject<T>(token: ServiceToken<T>): T {
    const referenceTarget = Object.create(null) as Record<PropertyKey, unknown>;
    let reference!: object;
    const handler: ProxyHandler<Record<PropertyKey, unknown>> = {
        get(_target, property) {
            if (property === INJECT_REFERENCE_SET_OWNER) {
                return (owner: object) => {
                    injectedReferenceOwners.set(reference, owner);
                };
            }

            if (property === INJECT_REFERENCE_CLONE) {
                return () => inject(token);
            }

            const service = resolveInjectedReferenceService(reference, token);
            const value = Reflect.get(Object(service), property, service as object);
            return typeof value === "function" ? value.bind(service) : value;
        },
        set() {
            throw new Error(
                `Injected reference "${describeToken(token)}" is read-only. ` +
                    "Register a different service implementation at startup instead of assigning to the reference.",
            );
        },
        has(_target, property) {
            const service = resolveInjectedReferenceService(reference, token);
            return property in Object(service);
        },
        ownKeys() {
            const service = resolveInjectedReferenceService(reference, token);
            return Reflect.ownKeys(Object(service));
        },
        getOwnPropertyDescriptor(_target, property): PropertyDescriptor | undefined {
            const service: T = resolveInjectedReferenceService(reference, token);
            const descriptor = Object.getOwnPropertyDescriptor(Object(service), property);
            if (!descriptor) {
                return undefined;
            }

            return {
                configurable: true,
                enumerable: descriptor.enumerable ?? true,
                writable: false,
                value: typeof descriptor.value === "function"
                    ? descriptor.value.bind(service)
                    : descriptor.value,
                get: descriptor.get?.bind(service),
                set: undefined,
            };
        },
    };
    reference = new Proxy(referenceTarget, handler);

    return reference as T;
}


function resolveInjectedReferenceService<T>(
    reference: object,
    token: ServiceToken<T>,
): T {
    const owner = injectedReferenceOwners.get(reference);
    const container = (owner ? readServiceContainer(owner) : undefined) ?? getCurrentServiceContainer();
    if (!container) {
        throw new Error(
            `Injected service "${describeToken(token)}" is not available. ` +
                "Start the app with services or render the owner under an active Mainz app container.",
        );
    }

    return container.get(token);
}
