import type { Principal } from "../../authorization/index.ts";
import { Authorize } from "../../authorization/index.ts";
import type { RouteContext } from "../index.ts";
import { Component, RenderStrategy } from "../index.ts";

export function createRoutePrincipal(
  principal: Principal | undefined,
  overrides: Partial<Pick<RouteContext, "renderMode" | "navigationMode">> = {},
): RouteContext {
  return {
    path: "/",
    matchedPath: "/",
    params: {},
    url: new URL("https://mainz.local/"),
    renderMode: overrides.renderMode ?? "csr",
    navigationMode: overrides.navigationMode ?? "spa",
    principal,
  };
}

let authorizedLoadCalls = 0;

export function resetAuthorizedLoadCalls(): void {
  authorizedLoadCalls = 0;
}

export function readAuthorizedLoadCalls(): number {
  return authorizedLoadCalls;
}

@Authorize({ roles: ["admin"] })
export class AdminPanel extends Component<{}, { clicks: number }> {
  protected override initState() {
    return { clicks: 0 };
  }

  private handleClick = () => {
    this.setState({ clicks: this.state.clicks + 1 });
  };

  override render(): HTMLElement {
    return (
      <button type="button" data-role="admin-panel" onClick={this.handleClick}>
        {String(this.state.clicks)}
      </button>
    );
  }
}

@Authorize({ roles: ["admin"] })
@RenderStrategy("blocking")
export class AuthorizedLoadPanel extends Component<{}, {}, { label: string }> {
  override load() {
    authorizedLoadCalls += 1;
    return {
      label: "protected-load",
    };
  }

  override render(): HTMLElement {
    return <p data-role="authorized-load">{this.data.label}</p>;
  }
}

export class AdminPanelHost extends Component<{
  route?: RouteContext;
}> {
  override render(): HTMLElement {
    return (
      <section>
        <p data-role="shell">shell</p>
        <AdminPanel />
      </section>
    );
  }
}

export class AuthorizedLoadHost extends Component<{
  route?: RouteContext;
}> {
  override render(): HTMLElement {
    return (
      <section>
        <p data-role="shell">shell</p>
        <AuthorizedLoadPanel />
      </section>
    );
  }
}
