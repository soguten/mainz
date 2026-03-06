import { Component } from "mainz";

export class ListenerLeakScenario extends Component<{}, { renders: number; clicks: number }> {
    static override styles = /*css*/`
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        button { padding: 6px 10px; }
    `;

    override onMount(): void {
        this.state = { renders: 0, clicks: 0 };
    }

    override afterRender(): void {
        const target = this.querySelector("button[data-role='target']");
        if (!target) return;
        this.registerEvent(target, "click", () => {
            this.state = { ...this.state, clicks: this.state.clicks + 1 };
        });
    }

    override render(): HTMLElement {
        const wrap = document.createElement("section");
        wrap.className = "card";

        const title = document.createElement("h3");
        title.textContent = "B) Acúmulo de listeners";

        const info = document.createElement("p");
        info.textContent = `renders=${this.state.renders} clicks=${this.state.clicks}`;

        const row = document.createElement("div");
        row.className = "row";

        const rerender = document.createElement("button");
        rerender.textContent = "Forçar re-render";
        rerender.onclick = () => this.setState({ renders: this.state.renders + 1 });

        const clickTarget = document.createElement("button");
        clickTarget.setAttribute("data-role", "target");
        clickTarget.textContent = "Clique aqui 1x";

        row.append(rerender, clickTarget);
        wrap.append(title, info, row);
        return wrap;
    }
}