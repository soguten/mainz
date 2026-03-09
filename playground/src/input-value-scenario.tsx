import { Component } from "mainz";

export class InputValueScenario extends Component<{}, { value: string; observed: string }> {
    static override styles = /*css*/`
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        button { padding: 6px 10px; margin-top: 8px; }
    `;

    protected override initState() {
        return { value: "a", observed: "a" };
    }

    private handleInput = (event: Event) => {
        const target = event.currentTarget as HTMLInputElement | null;
        const nextValue = target?.value ?? "";
        this.setState({ value: nextValue, observed: nextValue });
    };

    private syncServerValue = () => {
        this.setState({ value: "server-next", observed: "server-next" });
    };

    override render() {
        return (
            <section className="card">
                <h3>C - input.value vs attribute</h3>
                <p>state.value={this.state.value} input.value={this.state.observed}</p>
                <input value={this.state.value} onInput={this.handleInput} />
                <button type="button" onClick={this.syncServerValue}>Set state.value = server-next</button>
            </section>
        );
    }
}

