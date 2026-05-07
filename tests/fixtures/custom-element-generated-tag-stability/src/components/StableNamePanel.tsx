import { Component } from "mainz";

export class StableNamePanel extends Component {
  override render() {
    return (
      <section data-testid="stable-name-panel">
        <p>Generated component tag should stay stable in production builds.</p>
      </section>
    );
  }
}
