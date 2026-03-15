import { Component } from "mainz";

function FunctionalAction(props: { onAction: () => void; label: string }) {
    return <button type="button" onClick={props.onAction}>{props.label}</button>;
}

export class OwnerBoundClickComponent extends Component<{}, { clicks: number }> {
    protected override initState() {
        return { clicks: 0 };
    }

    override render(): HTMLElement {
        return (
            <button type="button" onClick={() => this.setState({ clicks: this.state.clicks + 1 })}>
                {String(this.state.clicks)}
            </button>
        );
    }
}

export class TeardownOwnerComponent extends Component<{}, { clicks: number }> {
    protected override initState() {
        return { clicks: 0 };
    }

    override render(): HTMLElement {
        return (
            <button type="button" onClick={() => this.setState({ clicks: this.state.clicks + 1 })}>
                {String(this.state.clicks)}
            </button>
        );
    }
}

export class FunctionalChildOwnerComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleAction = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <div>
                <FunctionalAction
                    label={String(this.state.count)}
                    onAction={this.handleAction}
                />
            </div>
        );
    }
}

export class FunctionalTeardownComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleAction = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <div>
                <FunctionalAction
                    label={String(this.state.count)}
                    onAction={this.handleAction}
                />
            </div>
        );
    }
}

export class IsolatedOwnerComponent extends Component<{ role: string }, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleAction = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <button type="button" data-role={this.props.role} onClick={this.handleAction}>
                {String(this.state.count)}
            </button>
        );
    }
}

export class NestedOwnerChildComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleAction = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <button type="button" data-role="child-action" onClick={this.handleAction}>
                {String(this.state.count)}
            </button>
        );
    }
}

export class NestedOwnerBoundaryComponent extends Component<{}, { version: number; showChild: boolean }> {
    protected override initState() {
        return { version: 0, showChild: true };
    }

    private handleParentRerender = () => {
        this.setState({ version: this.state.version + 1 });
    };

    private handleHideChild = () => {
        this.setState({ showChild: false });
    };

    override render(): HTMLElement {
        return (
            <section>
                <p data-role="parent-version">{String(this.state.version)}</p>
                <button type="button" data-role="parent-rerender" onClick={this.handleParentRerender}>
                    rerender
                </button>
                <button type="button" data-role="hide-child" onClick={this.handleHideChild}>
                    hide child
                </button>
                {this.state.showChild ? <NestedOwnerChildComponent /> : <p data-role="child-removed">removed</p>}
            </section>
        );
    }
}

export class ThrowingRenderOwnerComponent extends Component<{}, { shouldThrow: boolean }> {
    protected override initState() {
        return { shouldThrow: true };
    }

    override render(): HTMLElement {
        if (this.state.shouldThrow) {
            throw new Error("render-owner fixture failure");
        }

        return <button type="button">ok</button>;
    }
}
