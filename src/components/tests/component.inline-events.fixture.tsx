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