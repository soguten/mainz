import {
  Authorize,
  Component,
  type NoProps,
  type NoState,
  RenderStrategy,
} from "mainz";

/**
 * @mainz-diagnostics-ignore
 * component-authorization-ssg-warning: false positive; this fixture is only used from a CSR page, so the component is not rendered during SSG
 */
@Authorize({ roles: ["owner"] })
@RenderStrategy("blocking")
export class OwnerTools extends Component<NoProps, NoState, readonly string[]> {
  override load(): readonly string[] {
    return [
      "Rotate organization keys",
      "Approve high-risk exports",
      "Review audit log retention",
    ];
  }

  override render(): HTMLElement {
    return (
      <section className="authorize-site-owner-tools">
        <h3>Owner-only tools</h3>
        <p>
          This component carries its own role requirement. The broader page
          stays visible, but this block only renders for owners.
        </p>
        <ul>
          {this.data.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    );
  }
}
