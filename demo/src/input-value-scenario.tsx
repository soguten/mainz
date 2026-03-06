import { Component } from "mainz";

export class InputValueScenario extends Component<{}, { value: string; observed: string }> {
    static override styles = /*css*/`
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        button { padding: 6px 10px; margin-top: 8px; }
    `;

    override onMount(): void {
        this.state = { value: "a", observed: "a" };
    }

    override render(): HTMLElement {
        const wrap = document.createElement("section");
        wrap.className = "card";

        const title = document.createElement("h3");
        title.textContent = "C) input.value vs atributo";

        const input = document.createElement("input");
        input.setAttribute("value", this.state.value);
        input.oninput = () => {
            this.state = { ...this.state, observed: input.value };
            this.setState({});
        };

        const info = document.createElement("p");
        info.textContent = `state.value=${this.state.value} input.value=${this.state.observed}`;

        const sync = document.createElement("button");
        sync.textContent = "Set state.value = server-next";
        sync.onclick = () => this.setState({ value: "server-next" });

        wrap.append(title, info, input, sync);
        return wrap;
    }
}