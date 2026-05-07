import { Component } from "mainz";

export class FormHarnessComponent
  extends Component<{}, { text: string; choice: string }> {
  protected override initState() {
    return { text: "", choice: "a" };
  }

  private handleInput = (event: Event) => {
    const target = event.currentTarget as HTMLTextAreaElement | null;
    this.setState({ text: target?.value ?? "" });
  };

  private handleChange = (event: Event) => {
    const target = event.currentTarget as HTMLSelectElement | null;
    this.setState({ choice: target?.value ?? "a" });
  };

  override render(): HTMLElement {
    return (
      <div>
        <textarea value={this.state.text} onInput={this.handleInput} />
        <select value={this.state.choice} onChange={this.handleChange}>
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
        <p data-role="summary">{`${this.state.text}|${this.state.choice}`}</p>
      </div>
    );
  }
}

export class ClickHarnessComponent extends Component<{}, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }

  private onClick = () => {
    this.setState({ count: this.state.count + 1 });
  };

  override render(): HTMLElement {
    return (
      <button type="button" onClick={this.onClick}>
        {String(this.state.count)}
      </button>
    );
  }
}

export class DispatchHarnessComponent extends Component<{}, { value: string }> {
  protected override initState() {
    return { value: "none" };
  }

  private handleReady = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    this.setState({ value: customEvent.detail });
  };

  override afterRender(): void {
    const target = this.querySelector("button[data-role='target']");
    if (target && !target.hasAttribute("data-bound")) {
      target.setAttribute("data-bound", "true");
      this.registerEvent(target, "x-ready", this.handleReady);
    }
  }

  override render(): HTMLElement {
    return (
      <div>
        <button type="button" data-role="target">dispatch</button>
        <p>{this.state.value}</p>
      </div>
    );
  }
}
