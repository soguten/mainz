/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { attachServiceContainer } from "../context.ts";
import {
    createServiceContainer,
    DuplicateServiceError,
    inject,
    MissingServiceError,
    ServiceCycleError,
    singleton,
    transient,
} from "../index.ts";

class CounterService {
    constructor(readonly value: number) {}
}

class ServiceA {
    constructor(readonly label: string) {}
}

class ServiceB {
    constructor(readonly label: string) {}
}

Deno.test("di/container: singleton should cache once per container", () => {
    let instanceCount = 0;
    const container = createServiceContainer([
        singleton(CounterService, () => {
            instanceCount += 1;
            return new CounterService(5);
        }),
    ]);

    const first = container.get(CounterService);
    const second = container.get(CounterService);

    assertEquals(first, second);
    assertEquals(instanceCount, 1);
});

Deno.test("di/container: transient should create a new instance per resolution", () => {
    const container = createServiceContainer([
        transient(CounterService, () => new CounterService(Math.random())),
    ]);

    const first = container.get(CounterService);
    const second = container.get(CounterService);

    assertEquals(first === second, false);
});

Deno.test("di/container: singleton should support class-backed registrations", () => {
    class ConfigService {
        readonly baseUrl = "https://example.test";
    }

    class HttpClient {
        readonly config = inject(ConfigService);
        readonly baseUrl = this.config.baseUrl;
    }

    abstract class StoriesApi {
        abstract getBaseUrl(): string;
    }

    class HttpStoriesApi extends StoriesApi {
        readonly client = inject(HttpClient);

        override getBaseUrl(): string {
            return this.client.baseUrl;
        }
    }

    const container = createServiceContainer([
        singleton(ConfigService),
        singleton(HttpClient),
        singleton(StoriesApi, HttpStoriesApi),
    ]);

    const storiesApi = container.get(StoriesApi);

    assertEquals(storiesApi instanceof HttpStoriesApi, true);
    assertEquals(storiesApi.getBaseUrl(), "https://example.test");
});

Deno.test("di/container: transient should support class-backed registrations", () => {
    class RandomService {
        readonly value = Math.random();
    }

    const container = createServiceContainer([
        transient(RandomService),
    ]);

    const first = container.get(RandomService);
    const second = container.get(RandomService);

    assertEquals(first === second, false);
    assertEquals(first.value === second.value, false);
});

Deno.test("di/container: should reject duplicate service registrations", () => {
    assertThrows(
        () =>
            createServiceContainer([
                singleton(CounterService, () => new CounterService(1)),
                singleton(CounterService, () => new CounterService(2)),
            ]),
        DuplicateServiceError,
        'A service registration for "CounterService" already exists.',
    );
});

Deno.test("di/container: should throw a clear error for missing services", () => {
    const container = createServiceContainer([]);

    assertThrows(
        () => container.get(CounterService),
        MissingServiceError,
        'No service registration exists for "CounterService".',
    );
});

Deno.test("di/container: should detect dependency cycles", () => {
    const container = createServiceContainer([
        singleton(ServiceA, ({ get }) => new ServiceA(get(ServiceB).label)),
        singleton(ServiceB, ({ get }) => new ServiceB(get(ServiceA).label)),
    ]);

    assertThrows(
        () => container.get(ServiceA),
        ServiceCycleError,
        "A dependency cycle was detected in service registration",
    );
});

Deno.test("di/inject: should support inject(Token) for page and component owners", () => {
    class ExampleService {
        readonly message = "hello";
    }

    class ExamplePage {
        static readonly api = inject(ExampleService);
    }

    class ExampleComponent {
        readonly api = inject(ExampleService);
    }

    const container = createServiceContainer([
        singleton(ExampleService),
    ]);

    const pageOwner = attachServiceContainer(ExamplePage, container) as typeof ExamplePage;
    const componentOwner = attachServiceContainer(
        new ExampleComponent(),
        container,
    ) as ExampleComponent;

    assertEquals(pageOwner.api.message, "hello");
    assertEquals(componentOwner.api.message, "hello");
});
