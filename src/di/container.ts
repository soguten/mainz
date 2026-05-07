import { attachServiceContainer, withServiceContainer } from "./context.ts";

/** Constructor token used to identify a service inside the Mainz DI container. */
export type ServiceToken<T> = abstract new (...args: never[]) => T;
/** Concrete class implementation that can be instantiated by the DI container. */
export type ServiceImplementation<T> = new () => T;

/** Context object exposed to service factories while resolving dependencies. */
export interface ServiceFactoryContext {
  /** Resolves another service from the same active container. */
  get<T>(token: ServiceToken<T>): T;
}

/** Factory callback used to create a service instance from the active container context. */
export type ServiceFactory<T> = (context: ServiceFactoryContext) => T;

/** Normalized service registration stored by the Mainz DI container. */
export interface ServiceRegistration<T = unknown> {
  /** Token used to resolve the service. */
  token: ServiceToken<T>;
  /** Lifetime policy used by the container when producing instances. */
  lifetime: "singleton" | "transient";
  /** Factory responsible for producing the service instance. */
  factory: ServiceFactory<T>;
}

/** Service container contract used by Mainz runtime and component integration. */
export interface ServiceContainer {
  /** Resolves a service instance for the provided token. */
  get<T>(token: ServiceToken<T>): T;
}

/** Error raised when no registration exists for a requested service token. */
export class MissingServiceError extends Error {
  /** Creates a missing-service error that includes the active resolution chain. */
  constructor(
    token: ServiceToken<unknown>,
    chain: readonly ServiceToken<unknown>[],
  ) {
    super(
      `No service registration exists for "${describeToken(token)}".` +
        (chain.length > 0
          ? ` Resolution chain: ${
            chain.map((item) => describeToken(item)).join(" -> ")
          }.`
          : ""),
    );
    this.name = "MissingServiceError";
  }
}

/** Error raised when the same service token is registered more than once. */
export class DuplicateServiceError extends Error {
  /** Creates a duplicate-registration error for the provided service token. */
  constructor(token: ServiceToken<unknown>) {
    super(
      `A service registration for "${describeToken(token)}" already exists.`,
    );
    this.name = "DuplicateServiceError";
  }
}

/** Error raised when service resolution encounters a dependency cycle. */
export class ServiceCycleError extends Error {
  /** Creates a dependency-cycle error that includes the offending token chain. */
  constructor(chain: readonly ServiceToken<unknown>[]) {
    super(
      `A dependency cycle was detected in service registration: ${
        chain.map((item) => describeToken(item)).join(" -> ")
      }.`,
    );
    this.name = "ServiceCycleError";
  }
}

/** Registers a singleton service using its own implementation type as the token. */
export function singleton<T>(
  implementation: ServiceImplementation<T>,
): ServiceRegistration<T>;
/** Registers a singleton service using an explicit token and factory callback. */
export function singleton<T>(
  token: ServiceToken<T>,
  factory: ServiceFactory<T>,
): ServiceRegistration<T>;
/** Registers a singleton service using an explicit token and concrete implementation class. */
export function singleton<T, TImplementation extends T>(
  token: ServiceToken<T>,
  implementation: ServiceImplementation<TImplementation>,
): ServiceRegistration<T>;
/** Creates a singleton service registration. */
export function singleton<T>(
  tokenOrImplementation: ServiceToken<T> | ServiceImplementation<T>,
  implementationOrFactory?: ServiceImplementation<T> | ServiceFactory<T>,
): ServiceRegistration<T> {
  if (!implementationOrFactory) {
    return createServiceRegistration(
      "singleton",
      tokenOrImplementation,
      tokenOrImplementation as ServiceImplementation<T>,
    );
  }

  return createServiceRegistration(
    "singleton",
    tokenOrImplementation,
    implementationOrFactory,
  );
}

/** Registers a transient service using its own implementation type as the token. */
export function transient<T>(
  implementation: ServiceImplementation<T>,
): ServiceRegistration<T>;
/** Registers a transient service using an explicit token and factory callback. */
export function transient<T>(
  token: ServiceToken<T>,
  factory: ServiceFactory<T>,
): ServiceRegistration<T>;
/** Registers a transient service using an explicit token and concrete implementation class. */
export function transient<T, TImplementation extends T>(
  token: ServiceToken<T>,
  implementation: ServiceImplementation<TImplementation>,
): ServiceRegistration<T>;
/** Creates a transient service registration. */
export function transient<T>(
  tokenOrImplementation: ServiceToken<T> | ServiceImplementation<T>,
  implementationOrFactory?: ServiceImplementation<T> | ServiceFactory<T>,
): ServiceRegistration<T> {
  if (!implementationOrFactory) {
    return createServiceRegistration(
      "transient",
      tokenOrImplementation,
      tokenOrImplementation as ServiceImplementation<T>,
    );
  }

  return createServiceRegistration(
    "transient",
    tokenOrImplementation,
    implementationOrFactory,
  );
}

/** Creates a service container from a static list of service registrations. */
export function createServiceContainer(
  registrations: readonly ServiceRegistration[] = [],
): ServiceContainer {
  return new MainzServiceContainer(registrations);
}

export function describeToken(token: ServiceToken<unknown>): string {
  return token.name || "(anonymous service)";
}

class MainzServiceContainer implements ServiceContainer {
  private readonly registrations = new Map<
    ServiceToken<unknown>,
    ServiceRegistration<unknown>
  >();
  private readonly singletonInstances = new Map<
    ServiceToken<unknown>,
    unknown
  >();
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

    if (
      registration.lifetime === "singleton" &&
      this.singletonInstances.has(token)
    ) {
      return this.singletonInstances.get(token) as T;
    }

    if (this.resolutionStack.includes(token)) {
      throw new ServiceCycleError([...this.resolutionStack, token]);
    }

    this.resolutionStack.push(token);

    try {
      const instance = withServiceContainer(
        this,
        () =>
          registration.factory({
            get: <Value>(dependencyToken: ServiceToken<Value>) =>
              this.get(dependencyToken),
          }),
      ) as T;
      attachResolvedServiceToContainer(instance, this);

      if (registration.lifetime === "singleton") {
        this.singletonInstances.set(token, instance);
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }
}

function createServiceRegistration<T>(
  lifetime: ServiceRegistration["lifetime"],
  token: ServiceToken<T>,
  implementationOrFactory: ServiceImplementation<T> | ServiceFactory<T>,
): ServiceRegistration<T> {
  return {
    token,
    lifetime,
    factory: isServiceImplementation(implementationOrFactory)
      ? () => new implementationOrFactory()
      : implementationOrFactory,
  };
}

function attachResolvedServiceToContainer<T>(
  value: T,
  container: ServiceContainer,
): void {
  if (
    (typeof value !== "object" || value === null) && typeof value !== "function"
  ) {
    return;
  }

  attachServiceContainer(value, container);
}

function isServiceImplementation<T>(
  value: ServiceImplementation<T> | ServiceFactory<T>,
): value is ServiceImplementation<T> {
  return /^\s*class\s/.test(Function.prototype.toString.call(value));
}
