import { Component } from "mainz";

export class InitialStateComponent extends Component<{}, { count: number }> {
    renderCalls = 0;

    protected override initState() {
        return { count: 7 };
    }

    override render(): HTMLElement {
        this.renderCalls += 1;

        const p = document.createElement("p");
        p.textContent = String(this.state.count);
        return p;
    }
}

export class PropsInitialStateComponent extends Component<{ initial?: number }, { count: number }> {
    renderCalls = 0;

    protected override initState() {
        return { count: this.props.initial ?? 0 };
    }

    override render(): HTMLElement {
        this.renderCalls += 1;

        const p = document.createElement("p");
        p.textContent = String(this.state.count);
        return p;
    }
}

export class NoBootstrapRenderComponent extends Component<{}, { ready: boolean }> {
    renderCalls = 0;
    mountCalls = 0;

    protected override initState() {
        return { ready: true };
    }

    override onMount(): void {
        this.mountCalls += 1;
    }

    override render(): HTMLElement {
        this.renderCalls += 1;

        const p = document.createElement("p");
        p.textContent = this.state.ready ? "ready" : "not-ready";
        return p;
    }
}

export class InitOnceComponent extends Component<{}, { count: number }> {
    initCalls = 0;
    renderCalls = 0;

    protected override initState() {
        this.initCalls += 1;
        return { count: 1 };
    }

    override render(): HTMLElement {
        this.renderCalls += 1;

        const p = document.createElement("p");
        p.textContent = String(this.state.count);
        return p;
    }
}

export class StatefulComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 10 };
    }

    override render(): HTMLElement {
        const p = document.createElement("p");
        p.textContent = String(this.state.count);
        return p;
    }
}

export class StateOverrideComponent extends Component<{ initial?: number }, { count: number }> {
    initCalls = 0;

    protected override initState() {
        this.initCalls += 1;
        return { count: this.props.initial ?? 0 };
    }

    override render(): HTMLElement {
        const p = document.createElement("p");
        p.textContent = String(this.state.count);
        return p;
    }
}

export class AttrAwareComponent extends Component<{}, { role: string | null }> {
    protected override initState() {
        return { role: this.getAttribute("data-role") };
    }

    override render(): HTMLElement {
        const p = document.createElement("p");
        p.textContent = this.state.role ?? "none";
        return p;
    }
}