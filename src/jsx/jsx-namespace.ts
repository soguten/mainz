export { };

declare global {
  namespace JSX {

    type HtmlIntrinsicElements = {
      [K in keyof HTMLElementTagNameMap]?: unknown;
    };

    type SvgIntrinsicElements = {
      [K in keyof SVGElementTagNameMap]?: unknown;
    };


    interface IntrinsicElements extends HtmlIntrinsicElements, SvgIntrinsicElements {

      [k: `x-${string}`]: unknown;
    }

    interface ElementChildrenAttribute {
      children: {};
    }
  }
}