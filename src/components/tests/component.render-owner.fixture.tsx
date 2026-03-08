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