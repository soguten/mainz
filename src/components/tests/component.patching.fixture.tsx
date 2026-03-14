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


export class UnkeyedListPatchComponent extends Component<{}, { items: string[] }> {
    protected override initState() {
        return { items: ["a", "b", "c"] };
    }

    override render(): HTMLElement {
        const wrap = document.createElement("ul");

        for (const id of this.state.items ?? []) {
            const li = document.createElement("li");
            li.setAttribute("data-item", id);
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

export class ReRegisterListenerStateComponent extends Component<{}, { renders: number; clicks: number }> {
    private handleTargetClick = () => {
        this.setState({ clicks: this.state.clicks + 1 });
    };

    protected override initState() {
        return { renders: 0, clicks: 0 };
    }

    override afterRender(): void {
        const target = this.querySelector("button[data-role='target']");
        if (!target) return;

        this.registerEvent(target, "click", this.handleTargetClick);
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");

        const info = document.createElement("p");
        info.setAttribute("data-role", "info");
        info.textContent = `renders=${this.state.renders} clicks=${this.state.clicks}`;

        const rerenderButton = document.createElement("button");
        rerenderButton.setAttribute("data-role", "rerender");
        rerenderButton.textContent = "rerender";
        rerenderButton.onclick = () => {
            this.setState({ renders: this.state.renders + 1 });
        };

        const targetButton = document.createElement("button");
        targetButton.setAttribute("data-role", "target");
        targetButton.textContent = "target";

        wrap.append(info, rerenderButton, targetButton);
        return wrap;
    }
}

export class ControlledInputTypingComponent extends Component<{}, { text: string; observed: string }> {
    protected override initState() {
        return { text: "", observed: "" };
    }

    private handleInput = (event: Event) => {
        const target = event.currentTarget as HTMLInputElement | null;
        const nextValue = target?.value ?? "";
        this.setState({ text: nextValue, observed: nextValue });
    };

    override render(): HTMLElement {
        const wrap = document.createElement("div");

        const info = document.createElement("p");
        info.setAttribute("data-role", "info");
        info.textContent = `text=${this.state.text} observed=${this.state.observed}`;

        const input = document.createElement("input");
        input.setAttribute("value", this.state.text ?? "");
        input.oninput = this.handleInput;

        wrap.append(info, input);
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
export class CounterPatchComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        wrap.setAttribute("data-role", "counter-root");

        const title = document.createElement("h1");
        title.textContent = "Mainz Counter";

        const label = document.createElement("p");
        label.setAttribute("data-role", "count");
        label.textContent = `Count: ${this.state.count}`;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Increment";

        wrap.append(title, label, button);
        return wrap;
    }
}

export class FragmentRootComponent extends Component<{}, { count: number }> {
    renders = 0;

    protected override initState() {
        return { count: 0 };
    }

    override render(): DocumentFragment {
        this.renders += 1;

        return (
            <>
                <h1>Fragment Counter</h1>
                <p>Text</p>
            </>
        );
    }
}
