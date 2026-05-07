import { Component } from "mainz";

export class ExampleTestingHarnessComponent
  extends Component<{}, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }

  private increment = () => {
    this.setState({ count: this.state.count + 1 });
  };

  override render(): HTMLElement {
    return <button onClick={this.increment}>{String(this.state.count)}</button>;
  }
}
