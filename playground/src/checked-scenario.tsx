import { Component } from "mainz";

export class CheckedScenario
  extends Component<{}, { checked: boolean; observed: boolean }> {
  static override styles = /*css*/ `
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        button { padding: 6px 10px; }
    `;

  protected override initState() {
    return { checked: false, observed: false };
  }

  private handleChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    const nextChecked = target?.checked ?? false;
    this.setState({ checked: nextChecked, observed: nextChecked });
  };

  private forceChecked = () => {
    this.setState({ checked: true, observed: true });
  };

  private forceUnchecked = () => {
    this.setState({ checked: false, observed: false });
  };

  override render() {
    return (
      <section className="card">
        <h3>D - checked vs attribute (TSX)</h3>
        <p>
          state.checked={String(this.state.checked)}{" "}
          input.checked={String(this.state.observed)}
        </p>
        <input
          type="checkbox"
          checked={this.state.checked ? "" : undefined}
          onChange={this.handleChange}
        />
        <div className="row">
          <button type="button" onClick={this.forceChecked}>
            Set state.checked = true
          </button>
          <button type="button" onClick={this.forceUnchecked}>
            Set state.checked = false
          </button>
        </div>
      </section>
    );
  }
}
