import { Component } from "mainz";

export class ListPatchComponent extends Component<{}, { items: string[] }> {
    override onMount(): void {
        this.state = { items: ["a", "c"] };
        this.setState({});
    }

    override render(): HTMLElement {
        const wrap = document.createElement("ul");
        for (const id of this.state.items ?? []) {
            const li = document.createElement("li");
            li.setAttribute("data-id", id);
            li.textContent = id;
            wrap.appendChild(li);
        }
        return wrap;
    }
}

export class ReRegisterListenerComponent extends Component<{}, { count: number }> {
    clicks = 0;

    override onMount(): void {
        this.state = { count: 0 };
        this.setState({});
    }

    override afterRender(): void {
        const button = this.querySelector("button");
        if (!button) return;

        this.registerEvent(button, "click", () => {
            this.clicks += 1;
        });
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        const button = document.createElement("button");
        button.textContent = String(this.state.count ?? 0);
        wrap.appendChild(button);
        return wrap;
    }
}

export class ControlledInputComponent extends Component<{}, { text: string }> {
    override onMount(): void {
        this.state = { text: "a" };
        this.setState({});
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        const input = document.createElement("input");
        input.setAttribute("value", this.state.text ?? "");
        wrap.appendChild(input);
        return wrap;
    }
}

export class ControlledCheckedComponent extends Component<{}, { checked: boolean }> {
    override onMount(): void {
        this.state = { checked: false };
        this.setState({});
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        const input = document.createElement("input");
        input.type = "checkbox";

        if (this.state.checked) {
            input.setAttribute("checked", "");
        }

        wrap.appendChild(input);
        return wrap;
    }
}

export class TextNodeComponent extends Component<{}, { value: string }> {
    override onMount(): void {
        this.state = { value: "1" };
        this.setState({});
    }

    override render(): HTMLElement {
        const p = document.createElement("p");
        p.textContent = this.state.value;
        return p;
    }
}