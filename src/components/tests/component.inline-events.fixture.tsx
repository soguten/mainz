import { Component } from "mainz";

export class InlineClosureComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    override render(): HTMLElement {
        const capturedCount = this.state.count;

        return (
            <button type="button" onClick={() => this.setState({ count: capturedCount + 1 })}>
                {String(this.state.count)}
            </button>
        );
    }
}

export class InlineLabelComponent extends Component<{}, { label: string; last: string }> {
    protected override initState() {
        return { label: "A", last: "none" };
    }

    override render(): HTMLElement {
        const currentLabel = this.state.label;

        return (
            <div>
                <button type="button"onClick={() => this.setState({ last: currentLabel })}>
                    save
                </button>
                <p>{this.state.last}</p>
            </div>
        );
    }
}

export class StableHandlerComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleClick = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <button type="button" onClick={this.handleClick}>
                {String(this.state.count)}
            </button>
        );
    }
}

export class ConditionalBranchComponent extends Component<
    {},
    { showPrimary: boolean; primaryClicks: number; secondaryClicks: number }
> {
    protected override initState() {
        return { showPrimary: true, primaryClicks: 0, secondaryClicks: 0 };
    }

    private toggleBranch = () => {
        this.setState({ showPrimary: !this.state.showPrimary });
    };

    override render(): HTMLElement {
        return (
            <div>
                <button type="button" data-role="toggle" onClick={this.toggleBranch}>
                    toggle
                </button>
                {this.state.showPrimary
                    ? (
                        <button
                            key="primary"
                            type="button"
                            data-role="action"
                            onClick={() => this.setState({ primaryClicks: this.state.primaryClicks + 1 })}
                        >
                            primary:{this.state.primaryClicks}
                        </button>
                    )
                    : (
                        <button
                            key="secondary"
                            type="button"
                            data-role="action"
                            onClick={() => this.setState({ secondaryClicks: this.state.secondaryClicks + 1 })}
                        >
                            secondary:{this.state.secondaryClicks}
                        </button>
                    )}
                <p data-role="summary">{`${this.state.primaryClicks}|${this.state.secondaryClicks}`}</p>
            </div>
        );
    }
}
