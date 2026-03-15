import { Component } from "mainz";

export class AsyncAfterUnmountComponent extends Component<{}, { status: string }> {
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
