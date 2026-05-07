import {
  type BackendMode,
  describeBackendMode,
  readBackendMode,
  switchBackendMode,
} from "../lib/runtime.ts";
import { Button, Text, TypecaseRoot } from "mainz/typecase";

interface DiHttpFrameProps {
  eyebrow: string;
  title: string;
  lead: string;
  children?: unknown;
}

export function DiHttpFrame(props: DiHttpFrameProps) {
  const backendMode = readBackendMode();

  return (
    <TypecaseRoot className="di-http-app">
      <div className="di-http-shell">
        <header className="di-http-hero">
          <div className="di-http-topline">
            <a className="di-http-brand" href="/">
              Mainz DI + HTTP example
            </a>
            <span className="di-http-chip" data-active="true">
              {describeBackendMode(backendMode)}
            </span>
            <span className="di-http-chip">
              {backendMode === "mock"
                ? "Alternate mock app definition"
                : "StoriesApi -> HttpClient -> fetch"}
            </span>
          </div>

          <div>
            <Text
              as="p"
              className="di-http-eyebrow"
              tone="muted"
              weight="semibold"
            >
              {props.eyebrow}
            </Text>
            <h1 className="di-http-title">{props.title}</h1>
          </div>

          <p className="di-http-lead">{props.lead}</p>

          <div className="di-http-actions">
            {(["http", "mock"] as const).map((mode) => (
              <Button
                key={mode}
                className="di-http-button"
                data-selected={backendMode === mode ? "true" : "false"}
                onClick={() => applyBackendMode(mode)}
                size="sm"
                variant={backendMode === mode ? "primary" : "secondary"}
              >
                {mode === "http"
                  ? "Use HttpClient transport"
                  : "Use mock replacement"}
              </Button>
            ))}
            <a className="di-http-link-chip" href="/">
              Featured stories
            </a>
            <a className="di-http-link-chip" href="/stories/dependency-map">
              Open story route
            </a>
          </div>

          <div className="di-http-meta">
            <span className="di-http-chip">Page.load() owns route data</span>
            <span className="di-http-chip">
              Component.load() owns related rail
            </span>
            <span className="di-http-chip">Props stay semantic</span>
          </div>
        </header>

        {props.children}
      </div>
    </TypecaseRoot>
  );
}

function applyBackendMode(mode: BackendMode): void {
  switchBackendMode(mode);
}
