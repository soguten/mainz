import { Component } from "mainz";

function Badge(props: { text: string }) {
  return <strong data-role="badge">{props.text}</strong>;
}

export class JSXCounterComponent extends Component<{}, { count: number }> {
  lastRefTag = "none";

  protected override initState() {
    return { count: 0 };
  }

  private onClick = () => {
    this.setState({ count: this.state.count + 1 });
  };

  override render(): HTMLElement {
    return (
      <button
        className="counter"
        ref={(el: HTMLElement) => {
          this.lastRefTag = el.tagName;
        }}
        onClick={this.onClick}
      >
        {String(this.state.count)}
      </button>
    );
  }
}

export class JSXCompositionComponent extends Component<
  { label?: string },
  { saved: string }
> {
  protected override initState() {
    return { saved: "none" };
  }

  private onSave = () => {
    this.setState({ saved: this.props.label ?? "none" });
  };

  override render(): HTMLElement {
    const label = this.props.label ?? "none";

    return (
      <section>
        <button data-role="save" onClick={this.onSave}>save</button>
        <Badge text={label} />
        <>
          <span data-role="frag-a">A</span>
          <span data-role="frag-b">B</span>
        </>
        <p data-role="saved">{this.state.saved}</p>
      </section>
    );
  }
}

export class JSXChildrenConsumerComponent extends Component<
  { children?: unknown },
  Record<string, never>
> {
  override render(): HTMLElement {
    return (
      <div data-role="consumer">
        {this.props.children as HTMLElement | string}
      </div>
    );
  }
}

export class JSXChildrenHostComponent
  extends Component<{}, Record<string, never>> {
  override render(): HTMLElement {
    return (
      <JSXChildrenConsumerComponent>
        <span data-role="inner">ok</span>
        -tail
      </JSXChildrenConsumerComponent>
    );
  }
}

export class JSXChildrenNormalizationComponent
  extends Component<{}, Record<string, never>> {
  override render(): HTMLElement {
    return (
      <div data-role="norm">
        {null}
        {false}
        {0}
        {""}
        {"x"}
      </div>
    );
  }
}

export class JSXLeafComponent extends Component<{}, Record<string, never>> {
  override render(): HTMLElement {
    return <em data-role="leaf">leaf</em>;
  }
}

export class JSXNestedClassHostComponent
  extends Component<{}, Record<string, never>> {
  override render(): HTMLElement {
    return (
      <div>
        <JSXLeafComponent />
      </div>
    );
  }
}

export class JSXNestedClassRerenderHostComponent
  extends Component<{}, { tick: number }> {
  protected override initState() {
    return { tick: 0 };
  }

  private onRerender = () => {
    this.setState({ tick: this.state.tick + 1 });
  };

  override render(): HTMLElement {
    return (
      <section>
        <button type="button" data-role="rerender" onClick={this.onRerender}>
          rerender
        </button>
        <span data-role="tick">{String(this.state.tick)}</span>
        <JSXLeafComponent />
      </section>
    );
  }
}

export class JSXControlledTextareaComponent
  extends Component<{}, { text: string }> {
  protected override initState() {
    return { text: "" };
  }

  private onInput = (event: Event) => {
    const target = event.currentTarget as HTMLTextAreaElement | null;
    this.setState({ text: target?.value ?? "" });
  };

  override render(): HTMLElement {
    return (
      <section>
        <textarea value={this.state.text} onInput={this.onInput} />
        <p data-role="value">{this.state.text}</p>
      </section>
    );
  }
}

export class JSXEventPropChildComponent extends Component<
  { onInput: (value: string) => void; state?: string; value?: string },
  { value: string }
> {
  protected override initState() {
    return { value: "" };
  }

  private onInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    const nextValue = target?.value ?? "";
    this.setState({ value: nextValue });
    this.props.onInput(nextValue);
  };

  override render(): HTMLElement {
    return (
      <section>
        <input
          data-role="child-input"
          value={this.state.value}
          onInput={this.onInput}
        />
        <p data-role="child-value">{this.state.value}</p>
      </section>
    );
  }
}

export class JSXEventPropParentComponent extends Component<
  {},
  { calls: string[]; probe: string }
> {
  protected override initState() {
    return { calls: [], probe: "ready" };
  }

  private handleInput = (value: string) => {
    this.setState({
      calls: [...this.state.calls, value],
    });
  };

  override render(): HTMLElement {
    return (
      <section>
        <JSXEventPropChildComponent
          onInput={this.handleInput}
          state={this.state.probe}
          value="forwarded"
        />
        <p data-role="call-count">{String(this.state.calls.length)}</p>
        <p data-role="last-call">{this.state.calls.at(-1) ?? "none"}</p>
      </section>
    );
  }
}
