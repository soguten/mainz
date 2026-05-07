import { Component, Portal } from "mainz";

export class PortalLeftApp extends Component {
  override render(): HTMLElement {
    return (
      <main>
        <p>Left app</p>
        <Portal>
          <span data-testid="left-portal">Left overlay</span>
        </Portal>
      </main>
    );
  }
}

export class PortalRightApp extends Component {
  override render(): HTMLElement {
    return (
      <main>
        <p>Right app</p>
        <Portal>
          <span data-testid="right-portal">Right overlay</span>
        </Portal>
      </main>
    );
  }
}

export class PortalDocumentApp extends Component {
  override render(): HTMLElement {
    return (
      <main>
        <Portal scope="document" layer="overlay">
          <span data-testid="document-portal">Document overlay</span>
        </Portal>
      </main>
    );
  }
}

export class PortalTargetComponent extends Component<{ target: HTMLElement }> {
  override render(): HTMLElement {
    return (
      <main>
        <Portal target={this.props.target}>
          <span data-testid="target-portal">Target overlay</span>
        </Portal>
      </main>
    );
  }
}

export class PortalInteractiveApp extends Component<
  Record<string, never>,
  { label: string; open: boolean }
> {
  protected override initState(): { label: string; open: boolean } {
    return {
      label: "Ready",
      open: true,
    };
  }

  override render(): HTMLElement {
    return (
      <main>
        <button
          data-testid="toggle"
          onClick={() => this.setState({ open: false })}
        >
          Toggle
        </button>
        {this.state.open
          ? (
            <Portal>
              <button
                data-testid="portal-action"
                onClick={() => this.setState({ label: "Clicked" })}
              >
                {this.state.label}
              </button>
            </Portal>
          )
          : null}
      </main>
    );
  }
}
