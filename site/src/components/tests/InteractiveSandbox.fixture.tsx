import { InteractiveSandbox } from "../InteractiveSandbox.tsx";

type TestHljs = {
  highlight?: (
    code: string,
    options: { language: string; ignoreIllegals?: boolean },
  ) => { value: string };
  highlightElement: (element: Element) => void;
};

export { InteractiveSandbox };

export function installHighlightStub() {
  const calls: string[] = [];
  const highlight = (code: string) => {
    calls.push(code);

    const escapedCode = code
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    return {
      value: escapedCode.replaceAll(
        "import",
        '<span class="hljs-keyword">import</span>',
      ),
    };
  };

  const testWindow = window as Window & { hljs?: TestHljs };
  testWindow.hljs = {
    highlight,
    highlightElement: () => undefined,
  };

  return {
    calls,
    cleanup: () => {
      delete testWindow.hljs;
    },
  };
}
