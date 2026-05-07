import { Component } from "mainz";

export class PreloadedStateComponent
  extends Component<{}, { count: number; label: string; ready: boolean }> {
  override state = {
    count: 1,
    label: "initial",
    ready: false,
  };

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent = JSON.stringify(this.state);
    return p;
  }
}

export class PreserveExistingKeysComponent
  extends Component<{}, { a: number; b: number; c: number }> {
  override state = {
    a: 1,
    b: 2,
    c: 3,
  };

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent = `${this.state.a}-${this.state.b}-${this.state.c}`;
    return p;
  }
}

export class PartialOverrideComponent
  extends Component<{}, { status: string; count: number; selected: boolean }> {
  override state = {
    status: "idle",
    count: 0,
    selected: false,
  };

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent =
      `${this.state.status}|${this.state.count}|${this.state.selected}`;
    return p;
  }
}

export class InitStateBypassedComponent
  extends Component<{}, { count: number; label: string }> {
  initCalls = 0;

  override state = {
    count: 1,
    label: "preloaded",
  };

  protected override initState() {
    this.initCalls += 1;
    return {
      count: 999,
      label: "from-init",
    };
  }

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent = `${this.state.count}:${this.state.label}`;
    return p;
  }
}

export class FirstRenderMergedStateComponent
  extends Component<{}, { title: string; visible: boolean }> {
  renderCalls = 0;

  override state = {
    title: "draft",
    visible: false,
  };

  override render(): HTMLElement {
    this.renderCalls += 1;

    const p = document.createElement("p");
    p.textContent = `${this.state.title}:${this.state.visible}`;
    return p;
  }
}

export class FullOverrideComponent
  extends Component<{}, { mode: string; count: number }> {
  override state = {
    mode: "view",
    count: 1,
  };

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent = `${this.state.mode}:${this.state.count}`;
    return p;
  }
}
