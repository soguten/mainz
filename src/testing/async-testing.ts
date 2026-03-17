export async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

export async function waitFor(
    predicate: () => boolean,
    message = "Expected condition to become true.",
): Promise<void> {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        if (predicate()) {
            return;
        }

        await nextTick();
    }

    throw new Error(message);
}
