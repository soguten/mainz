import { Component } from "mainz";

export class StaleInlineHandlerCounter
  extends Component<{}, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }

  override render() {
    const capturedCount = this.state.count;

    return (
      <div className="wrap">
        <h1>Stale inline handler demo</h1>
        <p>Rendered count: {this.state.count}</p>
        <p>Captured count in current render: {capturedCount}</p>

        <button
          type="button"
          onClick={() => {
            this.setState({ count: capturedCount + 1 });
          }}
        >
          Increment
        </button>
      </div>
    );
  }
}
