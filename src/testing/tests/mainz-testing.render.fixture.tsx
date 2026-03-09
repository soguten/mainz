import { Component } from "mainz";

export class PropsAwareComponent extends Component<{ label?: string }, { label: string }> {
    protected override initState() {
        return { label: this.props.label ?? "none" };
    }

    override render(): HTMLElement {
        return <p>{this.state.label}</p>;
    }
}

export class AttrAwareComponent extends Component<{}, { mode: string }> {
    protected override initState() {
        return { mode: this.getAttribute("data-mode") ?? "missing" };
    }

    override render(): HTMLElement {
        return <p>{this.state.mode}</p>;
    }
}

export class OverrideStateComponent extends Component<{}, { a: number; b: number; c: number }> {
    override state = {
        a: 1,
        b: 2,
        c: 3,
    };

    protected override initState() {
        return {
            a: 10,
            b: 20,
            c: 30,
        };
    }

    override render(): HTMLElement {
        return <p>{`${this.state.a}-${this.state.b}-${this.state.c}`}</p>;
    }
}

export class AsyncOnMountComponent extends Component<{}, { status: string }> {
    protected override initState() {
        return { status: "init" };
    }

    override onMount(): void {
        Promise.resolve().then(() => {
            this.setState({ status: "ready" });
        });
    }

    override render(): HTMLElement {
        return <p>{this.state.status}</p>;
    }
}
