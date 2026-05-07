import { Component } from "mainz";

export class ExampleComponent extends Component<{}, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }

  override render(): HTMLElement {
    return (
      <button
        type="button"
        onClick={() => this.setState({ count: this.state.count + 1 })}
      >
        {String(this.state.count)}
      </button>
    );
  }
}
