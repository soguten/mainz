import { Component } from "mainz";

export class InitStateReadsAttrComponent
  extends Component<{}, { role: string | null }> {
  protected override initState() {
    return {
      role: this.getAttribute("data-role"),
    };
  }

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent = this.state.role ?? "none";
    return p;
  }
}

export class OnMountReadsAttrComponent extends Component {
  capturedRole: string | null = null;

  override onMount(): void {
    this.capturedRole = this.getAttribute("data-role");
  }

  override render(): HTMLElement {
    const div = document.createElement("div");
    div.textContent = "ok";
    return div;
  }
}

export class OnMountQueriesRenderedDomComponent extends Component {
  foundCanvas = false;

  override onMount(): void {
    this.foundCanvas =
      this.querySelector("canvas[data-chart='sales']") !== null;
  }

  override render(): HTMLElement {
    const canvas = document.createElement("canvas");
    canvas.dataset.chart = "sales";
    return canvas;
  }
}

export class HostAttrsComponent extends Component {
  override render(): HTMLElement {
    const div = document.createElement("div");
    div.textContent = "host";
    return div;
  }
}

export class AddAttrOnRenderComponent
  extends Component<{}, { active: boolean }> {
  protected override initState() {
    return { active: false };
  }

  override render(): HTMLElement {
    const button = document.createElement("button");
    button.textContent = "action";

    if (this.state.active) {
      button.setAttribute("data-active", "true");
    }

    return button;
  }
}

export class RemoveAttrOnRenderComponent
  extends Component<{}, { active: boolean }> {
  protected override initState() {
    return { active: true };
  }

  override render(): HTMLElement {
    const button = document.createElement("button");
    button.textContent = "action";

    if (this.state.active) {
      button.setAttribute("data-active", "true");
    }

    return button;
  }
}

export class UpdateAttrValueComponent
  extends Component<{}, { status: string }> {
  protected override initState() {
    return { status: "idle" };
  }

  override render(): HTMLElement {
    const div = document.createElement("div");
    div.setAttribute("data-status", this.state.status);
    div.textContent = this.state.status;
    return div;
  }
}

export class ToggleExclusiveAttrsComponent
  extends Component<{}, { kind: "a" | "b" }> {
  protected override initState() {
    // NOTE: `as const` is required here due to TypeScript literal type widening.
    // Without it, `{ kind: "a" }` would be inferred as `{ kind: string }`,
    // which is incompatible with `{ kind: "a" | "b" }`.
    return { kind: "a" as const };
  }

  override render(): HTMLElement {
    const div = document.createElement("div");

    if (this.state.kind === "a") {
      div.setAttribute("data-kind-a", "true");
    } else {
      div.setAttribute("data-kind-b", "true");
    }

    return div;
  }
}

export class MissingAttrComponent
  extends Component<{}, { role: string | null }> {
  protected override initState() {
    return {
      role: this.getAttribute("data-role"),
    };
  }

  override render(): HTMLElement {
    const p = document.createElement("p");
    p.textContent = this.state.role ?? "none";
    return p;
  }
}
