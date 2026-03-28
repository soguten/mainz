export function RelatedStoriesSkeleton() {
    return (
        <section className="di-http-related" data-state="skeleton">
            <p className="di-http-eyebrow">Component-level injection</p>
            <h2>Related stories</h2>
            <p>
                This delayed skeleton is intentional so the{" "}
                <span className="di-http-link">deferred</span> example stays visible during demo.
            </p>
            <div className="di-http-skeleton-list" aria-hidden="true">
                <div className="di-http-skeleton-card">
                    <span className="di-http-skeleton-line di-http-skeleton-line--title"></span>
                    <span className="di-http-skeleton-line di-http-skeleton-line--body"></span>
                    <span className="di-http-skeleton-line di-http-skeleton-line--body short"></span>
                </div>
                <div className="di-http-skeleton-card">
                    <span className="di-http-skeleton-line di-http-skeleton-line--title"></span>
                    <span className="di-http-skeleton-line di-http-skeleton-line--body"></span>
                    <span className="di-http-skeleton-line di-http-skeleton-line--body short"></span>
                </div>
            </div>
        </section>
    );
}
