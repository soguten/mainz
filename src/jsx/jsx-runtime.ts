import { Fragment as FragmentFactory, h } from "./dom-factory.ts";

type JSXType = string | ((props: Record<string, unknown>) => unknown);
type JSXProps = Record<string, unknown> | null;

export const Fragment = FragmentFactory;

export function jsx(type: JSXType, props: JSXProps, key?: string): HTMLElement {
  return createElement(type, props, key) as unknown as HTMLElement;
}

export function jsxs(type: JSXType, props: JSXProps, key?: string): HTMLElement {
  return createElement(type, props, key) as unknown as HTMLElement;
}

export function jsxDEV(type: JSXType, props: JSXProps, key?: string): HTMLElement {
  return createElement(type, props, key) as unknown as HTMLElement;
}

function createElement(type: JSXType, props: JSXProps, key?: string) {
  if (!props) return h(type, null);

  const { children, ...restProps } = props;
  const nextProps = key == null ? restProps : { ...restProps, key };

  if (children === undefined) {
    return h(type, nextProps);
  }

  const childrenArray = Array.isArray(children) ? children : [children];
  return h(type, nextProps, ...childrenArray);
}