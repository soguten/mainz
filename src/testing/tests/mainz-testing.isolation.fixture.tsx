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

export class IsolationSelectionSurface extends Component<{}, { selected: number | null }> {
    protected override initState() {
        return { selected: null };
    }

    private handleSelect = (index: number) => {
        this.setState({ selected: index });
    };

    override render(): HTMLElement {
        return (
            <div data-surface="selection">
                <button type="button" data-role="select-0" onClick={() => this.handleSelect(0)}>zero</button>
                <button type="button" data-role="select-1" onClick={() => this.handleSelect(1)}>one</button>
                <p data-role="selection-summary">{this.state.selected == null ? "none" : String(this.state.selected)}</p>
            </div>
        );
    }
}

export class IsolationDraftSurface extends Component<{}, { value: string; validated: boolean }> {
    protected override initState() {
        return { value: "", validated: false };
    }

    private handleInput = (event: Event) => {
        const target = event.currentTarget as HTMLTextAreaElement | null;
        this.setState({
            value: target?.value ?? "",
            validated: false,
        });
    };

    private handleValidate = () => {
        this.setState({ validated: this.state.value.includes("mainz") });
    };

    override render(): HTMLElement {
        return (
            <div data-surface="draft">
                <textarea data-role="draft-input" value={this.state.value} onInput={this.handleInput} />
                <button type="button" data-role="validate" onClick={this.handleValidate}>validate</button>
                <p data-role="draft-summary">{this.state.validated ? "ok" : "idle"}</p>
            </div>
        );
    }
}
