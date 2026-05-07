import {
  Component,
  CustomElement,
  Page,
  type RouteContext,
} from "../../index.ts";

@CustomElement("x-mainz-route-aware-panel")
export class RouteAwarePanel
  extends Component<{}, {}, { slug: string; locale: string }> {
  override load() {
    return {
      slug: String(this.route.params.slug ?? "missing"),
      locale: String(this.route.locale ?? "missing"),
    };
  }

  override render(): HTMLElement {
    return (
      <p data-role="route-panel">
        {this.route.params.slug}:{this.data.locale}
      </p>
    );
  }
}

export class RouteAwarePageHost extends Page<{ route: RouteContext }> {
  override render(): HTMLElement {
    return (
      <section>
        <RouteAwarePanel />
      </section>
    );
  }
}
