export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }

    interface ElementAttributesProperty {
      props: {};
    }

    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

declare module "mainz/jsx-runtime" {
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }

    interface ElementAttributesProperty {
      props: {};
    }

    interface ElementChildrenAttribute {
      children: {};
    }

    interface ElementClass {
      props: unknown;
    }
  }
}

declare module "mainz/jsx-dev-runtime" {
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }

    interface ElementAttributesProperty {
      props: {};
    }

    interface ElementChildrenAttribute {
      children: {};
    }

    interface ElementClass {
      props: unknown;
    }
  }
}