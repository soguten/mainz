import { Component } from "mainz";

export class IsolationCounterA extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleClick = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <button type="button" data-role="a" onClick={this.handleClick}>
                {String(this.state.count)}
            </button>
        );
    }
}

export class IsolationCounterB extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private handleClick = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return (
            <button type="button" data-role="b" onClick={this.handleClick}>
                {String(this.state.count)}
            </button>
        );
    }
}
