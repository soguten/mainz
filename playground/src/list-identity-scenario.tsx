import { Component } from "mainz";

type ListState = {
  items: string[];
  report: string;
};

export class ListIdentityScenario extends Component<{}, ListState> {
  static override styles = /*css*/ `
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 12px 0; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
        ul { margin: 6px 0 0; padding-left: 18px; }
        code { background: #f3f3f3; padding: 1px 4px; border-radius: 4px; }
        button { padding: 6px 10px; }
    `;

  protected override initState() {
    return { items: ["a", "c"], report: "-" };
  }

  private captureNodes(listSelector: string, attrName: string, ids: string[]) {
    const map = new Map<string, Element | null>();

    for (const id of ids) {
      const node = this.querySelector(
        `${listSelector} li[${attrName}='${id}']`,
      );
      map.set(id, node);
    }

    return map;
  }

  private summarizeIdentity(
    ids: string[],
    beforeMap: Map<string, Element | null>,
    afterMap: Map<string, Element | null>,
  ) {
    const preserved: string[] = [];

    for (const id of ids) {
      if (beforeMap.get(id) && beforeMap.get(id) === afterMap.get(id)) {
        preserved.push(id);
      }
    }

    return preserved.length === 0 ? "none" : preserved.join(",");
  }

  private runTransition = (nextItems: string[], label: string) => {
    const previousItems = this.state.items;
    const survivingIds = nextItems.filter((id) => previousItems.includes(id));

    const keyedBefore = this.captureNodes(
      "ul[data-list='keyed']",
      "data-id",
      survivingIds,
    );
    const unkeyedBefore = this.captureNodes(
      "ul[data-list='unkeyed']",
      "data-item",
      survivingIds,
    );

    this.setState({ items: nextItems });

    const keyedAfter = this.captureNodes(
      "ul[data-list='keyed']",
      "data-id",
      survivingIds,
    );
    const unkeyedAfter = this.captureNodes(
      "ul[data-list='unkeyed']",
      "data-item",
      survivingIds,
    );

    const keyedSummary = this.summarizeIdentity(
      survivingIds,
      keyedBefore,
      keyedAfter,
    );
    const unkeyedSummary = this.summarizeIdentity(
      survivingIds,
      unkeyedBefore,
      unkeyedAfter,
    );

    this.setState({
      report:
        `${label} | keyed preserved: ${keyedSummary} | unkeyed preserved: ${unkeyedSummary}`,
    });
  };

  private insertInMiddle = () => {
    this.runTransition(["a", "b", "c"], "insert (a,b,c)");
  };

  private reorderItems = () => {
    this.runTransition(["c", "b", "a"], "reorder (c,b,a)");
  };

  private filterItems = () => {
    this.runTransition(["a", "c"], "filter (a,c)");
  };

  private reset = () => {
    this.setState({ items: ["a", "c"], report: "-" });
  };

  override render() {
    return (
      <section className="card">
        <h3>A - patchChildren: keyed vs positional reuse</h3>
        <p>
          <code>keyed</code> list uses <code>data-id</code> (acts as key).{" "}
          <code>unkeyed</code> list uses <code>data-item</code>{" "}
          (plain attribute).
        </p>
        <p>Result: {this.state.report}</p>

        <div className="grid">
          <div>
            <strong>Keyed list (stable by item)</strong>
            <ul data-list="keyed">
              {(this.state.items ?? []).map((id) => <li data-id={id}>{id}</li>)}
            </ul>
          </div>

          <div>
            <strong>Unkeyed list (reuse by position)</strong>
            <ul data-list="unkeyed">
              {(this.state.items ?? []).map((id) => <li data-item={id}>{id}
              </li>)}
            </ul>
          </div>
        </div>

        <div className="row">
          <button type="button" onClick={this.insertInMiddle}>
            Insert in middle (a,b,c)
          </button>
          <button type="button" onClick={this.reorderItems}>
            Reorder (c,b,a)
          </button>
          <button type="button" onClick={this.filterItems}>Filter (a,c)</button>
          <button type="button" onClick={this.reset}>Reset</button>
        </div>
      </section>
    );
  }
}
