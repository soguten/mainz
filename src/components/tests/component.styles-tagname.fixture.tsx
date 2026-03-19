import { Component, CustomElement } from "mainz";

export class StringStylesComponent extends Component<{}, { count: number }> {
    static override styles = ".counter { color: red; }";

    protected override initState() {
        return { count: 0 };
    }

    override render(): HTMLElement {
        const span = document.createElement("span");
        span.className = "counter";
        span.textContent = String(this.state.count);
        return span;
    }
}

export class ArrayStylesComponent extends Component {
    static override styles = [
        ".a { color: blue; }",
        ".b { color: green; }",
    ];

    override render(): HTMLElement {
        const div = document.createElement("div");
        div.textContent = "ok";
        return div;
    }
}

export const DuplicateTagNameA = class SharedName extends Component {
    override render(): HTMLElement {
        return document.createElement("div");
    }
};

export const DuplicateTagNameB = class SharedName extends Component {
    override render(): HTMLElement {
        return document.createElement("div");
    }
};

@CustomElement("x-explicit-tag")
export class DecoratedTagComponent extends Component {
    override render(): HTMLElement {
        return document.createElement("div");
    }
}
