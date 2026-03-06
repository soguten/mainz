
import { Component } from "mainz";

export class CheckedScenario extends Component<{}, { checked: boolean; observed: boolean }> {
    
    static override styles = /*css*/`
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        button { padding: 6px 10px; margin-top: 8px; }
    `;

    override onMount(): void {
        this.state = { checked: false, observed: false };
    }

    override render(): HTMLElement {
        const wrap = document.createElement("section");
        wrap.className = "card";

        const title = document.createElement("h3");
        title.textContent = "D) checked vs atributo";

        const input = document.createElement("input");
        input.type = "checkbox";
        if (this.state.checked) input.setAttribute("checked", "");
        input.onchange = () => {
            this.state = { ...this.state, observed: input.checked };
            this.setState({});
        };

        const info = document.createElement("p");
        info.textContent = `state.checked=${this.state.checked} input.checked=${this.state.observed}`;

        const sync = document.createElement("button");
        sync.textContent = "Set state.checked = true";
        sync.onclick = () => this.setState({ checked: true });

        wrap.append(title, info, input, sync);
        return wrap;
    }
}