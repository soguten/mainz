import { Card } from "mainz/typecase";

export function RelatedStoriesSkeleton() {
  return (
    <Card className="di-http-related" data-state="skeleton" variant="subtle">
      <p className="di-http-eyebrow">Component-level injection</p>
      <Card.Title>Related stories</Card.Title>
      <p>
        This delayed skeleton is intentional so the{" "}
        <span className="di-http-link">defer</span>{" "}
        example stays visible during demo.
      </p>
      <div className="di-http-skeleton-list" aria-hidden="true">
        <div className="di-http-skeleton-card">
          <span className="di-http-skeleton-line di-http-skeleton-line--title">
          </span>
          <span className="di-http-skeleton-line di-http-skeleton-line--body">
          </span>
          <span className="di-http-skeleton-line di-http-skeleton-line--body short">
          </span>
        </div>
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
