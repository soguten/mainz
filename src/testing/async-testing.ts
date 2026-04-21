const DEFAULT_WAIT_ATTEMPTS = 100;

/** Waits for the current microtask queue and a zero-delay timer to flush. */
export async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

/** Repeatedly evaluates a predicate until it becomes true or times out. */
export async function waitFor(
    predicate: () => boolean,
    message = "Expected condition to become true.",
): Promise<void> {
    for (let attempt = 0; attempt < DEFAULT_WAIT_ATTEMPTS; attempt += 1) {
        if (predicate()) {
            return;
        }

        await nextTick();
    }

    throw new Error(message);
}

/** Waits for a matching custom event and returns its detail payload. */
export async function waitForCustomEvent<T>(
    eventName: string,
    options?: {
        target?: EventTarget;
        predicate?: (detail: T) => boolean;
        message?: string;
    },
): Promise<T> {
    let detail: T | undefined;
    const handleEvent = (event: Event) => {
        if (!(event instanceof CustomEvent)) {
            return;
        }

        const candidate = event.detail as T;
        if (options?.predicate && !options.predicate(candidate)) {
            return;
        }

        detail = candidate;
    };

    const target = options?.target ?? document;
    target.addEventListener(eventName, handleEvent);

    try {
        await waitFor(
            () => detail !== undefined,
            options?.message ?? `Expected custom event "${eventName}".`,
        );
        return detail!;
    } finally {
        target.removeEventListener(eventName, handleEvent);
    }
}
