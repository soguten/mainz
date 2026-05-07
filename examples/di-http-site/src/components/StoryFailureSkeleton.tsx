import { Card } from "mainz/typecase";

export function StoryFailureSkeleton() {
  return (
    <Card className="di-http-panel" data-state="skeleton" variant="subtle">
      <p className="di-http-eyebrow">Error lifecycle example</p>
      <Card.Title>Defer preview</Card.Title>
      <div className="di-http-skeleton-list" aria-hidden="true">
        <div className="di-http-skeleton-card">
          <span className="di-http-skeleton-line di-http-skeleton-line--title">
          </span>
          <span className="di-http-skeleton-line di-http-skeleton-line--body">
          </span>
          <span className="di-http-skeleton-line di-http-skeleton-line--body short">
          </span>
        </div>
      </div>
    </Card>
  );
}
