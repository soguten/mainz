import type { Component as MainzComponent } from "../components/component.ts";
import { Fragment as FragmentFactory, h } from "./dom-factory.ts";

type JSXFunctionComponent = (props: Record<string, unknown>) => unknown;
type JSXClassComponent = {
  new (): MainzComponent;
  getTagName(): string;
};
type JSXType = string | JSXFunctionComponent | JSXClassComponent;
type JSXProps = Record<string, unknown> | null;
type JSXNode = HTMLElement;

// deno-lint-ignore no-namespace
export namespace JSX {
  export interface IntrinsicElements {
    [elemName: string]: unknown;
  }

  export interface IntrinsicAttributes {
    [attrName: string]: unknown;
    key?: string | number;
  }

  export interface ElementAttributesProperty {
    props: Record<PropertyKey, unknown>;
  }

  export interface ElementChildrenAttribute {
    children: Record<PropertyKey, unknown>;
  }

  export interface ElementClass {
    props: unknown;
  }

  // deno-lint-ignore no-explicit-any
  export type Element = any;
}

export const Fragment = FragmentFactory;

export function jsx(type: JSXType, props: JSXProps, key?: string): JSXNode {
  return createElement(type, props, key) as JSXNode;
}

export function jsxs(type: JSXType, props: JSXProps, key?: string): JSXNode {
  return createElement(type, props, key) as JSXNode;
}

export function jsxDEV(type: JSXType, props: JSXProps, key?: string): JSXNode {
  return createElement(type, props, key) as JSXNode;
}

function createElement(type: JSXType, props: JSXProps, key?: string): unknown {
  if (!props) return h(type, null);

  const { children, ...restProps } = props;
  const nextProps = key == null ? restProps : { ...restProps, key };

  if (children === undefined) {
    return h(type, nextProps);
  }

  const childrenArray = Array.isArray(children) ? children : [children];
  return h(type, nextProps, ...childrenArray);
}
