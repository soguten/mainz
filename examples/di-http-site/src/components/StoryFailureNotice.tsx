export function StoryFailureNotice(args: { error: unknown }) {
    const message = args.error instanceof Error ? args.error.message : String(args.error);

    return (
        <section className="di-http-panel di-http-panel--error" data-state="error">
            <p className="di-http-eyebrow">Error fallback example</p>
            <h2>Deferred preview</h2>
            <p>
                This panel intentionally asks the API for a missing story so the example can show
                an <span className="di-http-link">errorFallback</span>.
            </p>
            <p className="di-http-error-copy">{message}</p>
        </section>
    );
}
