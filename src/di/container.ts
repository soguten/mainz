export type ServiceToken<T> = abstract new (...args: never[]) => T;

export interface ServiceFactoryContext {
    get<T>(token: ServiceToken<T>): T;
}

export interface ServiceRegistration<T = unknown> {
    token: ServiceToken<T>;
    lifetime: "singleton" | "transient";
    factory: (context: ServiceFactoryContext) => T;
}

export interface ServiceContainer {
    get<T>(token: ServiceToken<T>): T;
}

export class MissingServiceError extends Error {
    constructor(token: ServiceToken<unknown>, chain: readonly ServiceToken<unknown>[]) {
        super(
            `No service registration exists for "${describeToken(token)}".` +
                (chain.length > 0
                    ? ` Resolution chain: ${chain.map((item) => describeToken(item)).join(" -> ")}.`
                    : ""),
        );
        this.name = "MissingServiceError";
    }
}

export class DuplicateServiceError extends Error {
    constructor(token: ServiceToken<unknown>) {
        super(`A service registration for "${describeToken(token)}" already exists.`);
        this.name = "DuplicateServiceError";
    }
}

export class ServiceCycleError extends Error {
    constructor(chain: readonly ServiceToken<unknown>[]) {
        super(
            `A dependency cycle was detected in service registration: ${
                chain.map((item) => describeToken(item)).join(" -> ")
            }.`,
        );
        this.name = "ServiceCycleError";
    }
}

export function singleton<T>(
    token: ServiceToken<T>,
    factory: (context: ServiceFactoryContext) => T,
): ServiceRegistration<T> {
    return {
        token,
        lifetime: "singleton",
        factory,
    };
}

export function transient<T>(
    token: ServiceToken<T>,
    factory: (context: ServiceFactoryContext) => T,
): ServiceRegistration<T> {
    return {
        token,
        lifetime: "transient",
        factory,
    };
}

export function createServiceContainer(
    registrations: readonly ServiceRegistration[] = [],
): ServiceContainer {
    return new MainzServiceContainer(registrations);
}

export function describeToken(token: ServiceToken<unknown>): string {
    return token.name || "(anonymous service)";
}

class MainzServiceContainer implements ServiceContainer {
    private readonly registrations = new Map<ServiceToken<unknown>, ServiceRegistration<unknown>>();
    private readonly singletonInstances = new Map<ServiceToken<unknown>, unknown>();
    private readonly resolutionStack: ServiceToken<unknown>[] = [];

    constructor(registrations: readonly ServiceRegistration[]) {
        for (const registration of registrations) {
            if (this.registrations.has(registration.token)) {
                throw new DuplicateServiceError(registration.token);
            }

            this.registrations.set(registration.token, registration);
        }
    }

    get<T>(token: ServiceToken<T>): T {
        const registration = this.registrations.get(token);
        if (!registration) {
            throw new MissingServiceError(token, this.resolutionStack);
        }

        if (registration.lifetime === "singleton" && this.singletonInstances.has(token)) {
            return this.singletonInstances.get(token) as T;
        }

        if (this.resolutionStack.includes(token)) {
            throw new ServiceCycleError([...this.resolutionStack, token]);
        }

        this.resolutionStack.push(token);

        try {
            const instance = registration.factory({
                get: <Value>(dependencyToken: ServiceToken<Value>) => this.get(dependencyToken),
            }) as T;

            if (registration.lifetime === "singleton") {
                this.singletonInstances.set(token, instance);
            }

            return instance;
        } finally {
            this.resolutionStack.pop();
        }
    }
}
