import { Component } from "mainz";

export class NarrowPropsClassComponent extends Component<
    { title: string },
    Record<string, never>
> {
    override render(): HTMLElement {
        return <article>{this.props.title}</article>;
    }
}

export const typedCapture: { lastProps?: Record<string, unknown> } = {};

export function resetTypedCapture(): void {
    typedCapture.lastProps = undefined;
}

export function NarrowPropsFunctionComponent(
    props: { label: string },
): HTMLElement {
    typedCapture.lastProps = props as unknown as Record<string, unknown>;
    return <p>{props.label}</p>;
}

export function createTypedKeyUsages() {
    const classNode = <NarrowPropsClassComponent key="class-key" title="class-ok" />;
    const functionNode = <NarrowPropsFunctionComponent key="fn-key" label="function-ok" />;

    return { classNode, functionNode };
}
