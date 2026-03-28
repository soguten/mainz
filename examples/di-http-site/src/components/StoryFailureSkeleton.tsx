export function StoryFailureSkeleton() {
    return (
        <section className="di-http-panel" data-state="skeleton">
            <p className="di-http-eyebrow">Error fallback example</p>
            <h2>Deferred preview</h2>
            <div className="di-http-skeleton-list" aria-hidden="true">
                <div className="di-http-skeleton-card">
                    <span className="di-http-skeleton-line di-http-skeleton-line--title"></span>
                    <span className="di-http-skeleton-line di-http-skeleton-line--body"></span>
                    <span className="di-http-skeleton-line di-http-skeleton-line--body short"></span>
                </div>
            </div>
        </section>
    );
}
