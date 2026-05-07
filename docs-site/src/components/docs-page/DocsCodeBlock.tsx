import { Component, CustomElement } from "mainz";
import {
  isDocsHighlightReady,
  renderHighlightedDocsCode,
} from "../../lib/highlight.ts";

const docsCodeBlockResetTimeoutIds = new WeakMap<DocsCodeBlock, number>();

interface DocsCodeBlockProps {
  label: string;
  language?: string;
  content: string;
}

interface DocsCodeBlockState {
  copied: boolean;
}

@CustomElement("x-mainz-docs-code-block")
export class DocsCodeBlock
  extends Component<DocsCodeBlockProps, DocsCodeBlockState> {
  static copyFeedbackDurationMs = 1200;

  protected override initState(): DocsCodeBlockState {
    return {
      copied: false,
    };
  }

  override onMount(): void {
    if (!isDocsHighlightReady() && document.readyState !== "complete") {
      this.registerDOMEvent(window, "load", this.handleWindowLoad);
    }
  }

  override onUnmount(): void {
    const resetCopyTimeoutId = docsCodeBlockResetTimeoutIds.get(this);
    if (resetCopyTimeoutId !== undefined) {
      window.clearTimeout(resetCopyTimeoutId);
      docsCodeBlockResetTimeoutIds.delete(this);
    }
  }

  override render() {
    const language = normalizeCodeLanguage(this.props.language);
    const highlightedCode = renderHighlightedDocsCode(
      this.props.content,
      language,
    );
    const label = this.props.label?.trim()
      ? this.props.label
      : language || "code";

    return (
      <div class="docs-code">
        <div class="docs-code-header">
          <div class="docs-code-header-copy">
            <span class="docs-code-label">{label}</span>
            <span class="docs-code-language">{this.props.language ?? ""}</span>
          </div>

          <button
            type="button"
            class="docs-copy-button"
            aria-label={`Copy ${label}`}
            onClick={() => void this.copyCode()}
          >
            {this.state.copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div class="docs-code-body">
          <pre>
                        <code
                            class={highlightedCode.highlighted ? "hljs" : undefined}
                            data-code-language={language}
                        >
                            {highlightedCode.content}
                        </code>
          </pre>
        </div>
      </div>
    );
  }

  private async copyCode(): Promise<void> {
    const copied = await copyTextToClipboard(this.props.content);

    if (!copied) {
      return;
    }

    this.setState({ copied: true });

    const existingResetTimeoutId = docsCodeBlockResetTimeoutIds.get(this);
    if (existingResetTimeoutId !== undefined) {
      window.clearTimeout(existingResetTimeoutId);
    }

    const resetCopyTimeoutId = window.setTimeout(() => {
      this.setState({ copied: false });
      docsCodeBlockResetTimeoutIds.delete(this);
    }, (this.constructor as typeof DocsCodeBlock).copyFeedbackDurationMs);

    docsCodeBlockResetTimeoutIds.set(this, resetCopyTimeoutId);
  }

  private handleWindowLoad = () => {
    this.rerender();
  };
}

function normalizeCodeLanguage(language?: string): string {
  const normalized = (language ?? "").trim().toLowerCase();
  if (normalized === "tsx") {
    return "typescript";
  }
  if (normalized === "sh") {
    return "bash";
  }
  return normalized || "plaintext";
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand?.("copy") ?? false;
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }

  return copied;
}
