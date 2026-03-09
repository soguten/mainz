import { Component } from "mainz";

export class ListenerLeakScenario extends Component<{}, { renders: number; clicks: number }> {
    static override styles = /*css*/`
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        button { padding: 6px 10px; }
    `;

    protected override initState() {
        return { renders: 0, clicks: 0 };
    }

    private handleTargetClick = () => {
        this.setState({ clicks: this.state.clicks + 1 });
    };

    private forceRerender = () => {
        this.setState({ renders: this.state.renders + 1 });
    };

    override afterRender(): void {
        const target = this.querySelector("button[data-role='target']");
        if (!target) return;
        this.registerEvent(target, "click", this.handleTargetClick);
    }

    override render() {
        return (
            <section className="card">
                <h3>B - Listener accumulation</h3>
                <p>renders={this.state.renders} clicks={this.state.clicks}</p>
                <div className="row">
                    <button type="button" onClick={this.forceRerender}>Force re-render</button>
                    <button type="button" data-role="target">Click here once</button>
                </div>
            </section>
        );
    }
}

