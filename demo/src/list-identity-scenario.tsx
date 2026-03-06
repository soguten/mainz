import { Component } from "mainz";

type ListState = {
    items: string[];
    identityResult: string;
};

export class ListIdentityScenario extends Component<{}, ListState> {
    static override styles = /*css*/`
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        button { padding: 6px 10px; }
    `;

    override onMount(): void {
        this.state = { items: ["a", "c"], identityResult: "-" };
    }

    private checkIdentity(nextItems: string[], target: string) {
        const before = this.querySelector(`li[data-id='${target}']`);
        this.setState({ items: nextItems });
        const after = this.querySelector(`li[data-id='${target}']`);
        this.setState({ identityResult: before === after ? `${target}: mesmo nó` : `${target}: nó trocado` });
    }

    override render(): HTMLElement {
        const wrap = document.createElement("section");
        wrap.className = "card";

        const title = document.createElement("h3");
        title.textContent = "A) patchChildren por posição";

        const result = document.createElement("p");
        result.textContent = `Resultado: ${this.state.identityResult}`;

        const list = document.createElement("ul");
        for (const id of this.state.items ?? []) {
            const li = document.createElement("li");
            li.setAttribute("data-id", id);
            li.textContent = id;
            list.appendChild(li);
        }

        const actions = document.createElement("div");
        actions.className = "row";

        const insertBtn = document.createElement("button");
        insertBtn.textContent = "Inserir no meio (a,b,c)";
        insertBtn.onclick = () => this.checkIdentity(["a", "b", "c"], "c");

        const reorderBtn = document.createElement("button");
        reorderBtn.textContent = "Reordenar (c,b,a)";
        reorderBtn.onclick = () => this.checkIdentity(["c", "b", "a"], "a");

        const filterBtn = document.createElement("button");
        filterBtn.textContent = "Filtrar (a,c)";
        filterBtn.onclick = () => this.checkIdentity(["a", "c"], "c");

        actions.append(insertBtn, reorderBtn, filterBtn);
        wrap.append(title, result, list, actions);
        return wrap;
    }
}