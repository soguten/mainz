import { Card } from "mainz/typecase";

export function StoryFailureNotice(args: { error: unknown }) {
    const message = args.error instanceof Error ? args.error.message : String(args.error);

    return (
        <Card className="di-http-panel di-http-panel--error" data-state="error" variant="subtle">
            <p className="di-http-eyebrow">Error lifecycle example</p>
            <Card.Title>Defer preview</Card.Title>
            <p>
                This panel intentionally asks the API for a missing story so the example can show an
                {" "}
                <span className="di-http-link">error()</span> lifecycle hook.
            </p>
            <p className="di-http-error-copy">{message}</p>
        </Card>
    );
}
