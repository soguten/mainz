import { Component, CustomElement } from "mainz";
import { getLocale, t } from "mainz/i18n";

export interface RouteGenerationMetadata {
  routeRenderMode: "csr" | "ssg" | "ssr";
  documentRenderMode: "csr" | "ssg" | "ssr";
  generatedAt: string;
  generationRuntime: "build" | "preview";
  routePath: string;
  renderPath: string;
  locale?: string;
}

interface RenderDiagnosticsPanelProps {
  initialMetadata?: Partial<RouteGenerationMetadata>;
}

interface DiagnosticsState {
  metadata?: Partial<RouteGenerationMetadata>;
}

@CustomElement("x-render-diagnostics-panel")
export class RenderDiagnosticsPanel
  extends Component<RenderDiagnosticsPanelProps, DiagnosticsState> {
  protected override initState(): DiagnosticsState {
    const initialMetadata = this.props.initialMetadata;
    return {
      metadata: mergeMetadata(initialMetadata, readRouteGenerationMetadata()),
    };
  }

  override onMount(): void {
    const metadata = mergeMetadata(
      this.props.initialMetadata,
      readRouteGenerationMetadata(),
    );
    if (metadata !== this.state.metadata) {
      this.setState({ metadata });
    }
  }

  override render(): HTMLElement {
    const locale = resolvePanelLocale(this.state.metadata?.locale);
    const metadata = this.state.metadata;

    return (
      <section className="panel diagnostics-panel">
        <div className="diagnostics-header">
          <div>
            <p className="eyebrow">{t("diagnostics.eyebrow")}</p>
            <h2>{t("diagnostics.title")}</h2>
          </div>
          <span className="diagnostics-badge">
            {metadata?.routeRenderMode?.toUpperCase() ?? "DEV"}
          </span>
        </div>

        <p className="lead diagnostics-lead">{t("diagnostics.description")}</p>

        <dl className="diagnostics-grid">
          <div className="diagnostics-item">
            <dt>{t("diagnostics.routeModeLabel")}</dt>
            <dd>{metadata?.routeRenderMode?.toUpperCase() ?? "unknown"}</dd>
          </div>
          <div className="diagnostics-item">
            <dt>{t("diagnostics.documentModeLabel")}</dt>
            <dd>{metadata?.documentRenderMode?.toUpperCase() ?? "unknown"}</dd>
          </div>
          <div className="diagnostics-item">
            <dt>{t("diagnostics.generatedAtLabel")}</dt>
            <dd>
              {formatGeneratedAt(metadata?.generatedAt, locale)}
            </dd>
          </div>
          <div className="diagnostics-item">
            <dt>{t("diagnostics.runtimeLabel")}</dt>
            <dd>{formatGenerationRuntime(metadata?.generationRuntime)}</dd>
          </div>
          <div className="diagnostics-item diagnostics-item-wide">
            <dt>{t("diagnostics.routePathLabel")}</dt>
            <dd>
              <code>{metadata?.routePath ?? window.location.pathname}</code>
            </dd>
          </div>
          <div className="diagnostics-item diagnostics-item-wide">
            <dt>{t("diagnostics.renderPathLabel")}</dt>
            <dd>
              <code>{metadata?.renderPath ?? window.location.pathname}</code>
            </dd>
          </div>
        </dl>
      </section>
    );
  }
}

function readRouteGenerationMetadata(): RouteGenerationMetadata | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const script = document.querySelector<HTMLScriptElement>(
    "#mainz-route-generation",
  );
  if (!script?.textContent?.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(script.textContent) as RouteGenerationMetadata;
    return isRouteGenerationMetadata(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function mergeMetadata(
  initialMetadata: Partial<RouteGenerationMetadata> | undefined,
  documentMetadata: RouteGenerationMetadata | undefined,
): Partial<RouteGenerationMetadata> | undefined {
  if (!initialMetadata && !documentMetadata) {
    return undefined;
  }

  return {
    ...initialMetadata,
    ...documentMetadata,
  };
}

function isRouteGenerationMetadata(
  value: unknown,
): value is RouteGenerationMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isRenderMode(candidate.routeRenderMode) &&
    isRenderMode(candidate.documentRenderMode) &&
    typeof candidate.generatedAt === "string" &&
    (candidate.generationRuntime === "build" ||
      candidate.generationRuntime === "preview") &&
    typeof candidate.routePath === "string" &&
    typeof candidate.renderPath === "string" &&
    (typeof candidate.locale === "undefined" ||
      candidate.locale === "en" ||
      candidate.locale === "pt")
  );
}

function isRenderMode(value: unknown): value is "csr" | "ssg" | "ssr" {
  return value === "csr" || value === "ssg" || value === "ssr";
}

function resolvePanelLocale(locale: string | undefined): string {
  return locale === "pt" || locale === "en" ? locale : getLocale();
}

function formatGeneratedAt(
  generatedAt: string | undefined,
  locale: string,
): string {
  if (!generatedAt) {
    return locale === "pt"
      ? "presente no metadata do documento"
      : "present in document metadata";
  }

  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    return generatedAt;
  }

  const formatterLocale = locale === "pt" ? "pt-BR" : "en-US";

  try {
    return new Intl.DateTimeFormat(formatterLocale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(formatterLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }
}

function formatGenerationRuntime(
  generationRuntime: "build" | "preview" | undefined,
): string {
  if (generationRuntime === "build") {
    return "build";
  }

  if (generationRuntime === "preview") {
    return "preview";
  }

  return "unknown";
}
