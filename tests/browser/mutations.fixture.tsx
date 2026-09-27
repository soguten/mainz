import { Component } from "mainz";
import { h } from "../../src/jsx/dom-factory.ts";

type Item = { id: string; title: string };

type MutationFlowState = {
  item: Item;
  editing: boolean;
  draft: string;
  saving: boolean;
  fieldError: string;
  status: string;
};

export class MutationFlowComponent extends Component<
  Record<string, never>,
  MutationFlowState
> {
  private saveController?: AbortController;
  private saveInFlight = false;

  protected override initState(): MutationFlowState {
    return {
      item: { id: "1", title: "Notebook" },
      editing: false,
      draft: "",
      saving: false,
      fieldError: "",
      status: "",
    };
  }

  private edit(): void {
    this.setState({
      editing: true,
      draft: this.state.item.title,
      fieldError: "",
      status: "",
    });
  }

  private cancel(): void {
    if (this.saveController) {
      this.saveController.abort();
      return;
    }
    this.setState({ editing: false, fieldError: "", status: "" });
  }

  private async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.saveInFlight) return;

    const form = event.currentTarget as HTMLFormElement;
    const title = new FormData(form).get("title");
    if (typeof title !== "string") return;

    this.saveInFlight = true;
    const controller = new AbortController();
    this.saveController = controller;
    this.setState({ saving: true, fieldError: "", status: "" });

    try {
      const response = await fetch(`/api/items/${this.state.item.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
        signal: controller.signal,
      });
      const result = await response.json();

      if (response.status === 422) {
        this.setState({
          saving: false,
          fieldError: result.fieldErrors?.title ?? "Please check this field.",
          status: "The item could not be saved.",
        });
        return;
      }
      if (!response.ok) {
        this.setState({
          saving: false,
          status: result.message ?? "The item could not be saved. Try again.",
        });
        return;
      }

      this.setState({
        item: result.item,
        editing: false,
        saving: false,
        fieldError: "",
        status: "Item saved.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        this.setState({
          editing: false,
          saving: false,
          status: "Save cancelled.",
        });
      } else {
        this.setState({
          saving: false,
          status: "The item could not be saved. Try again.",
        });
      }
    } finally {
      if (this.saveController === controller) {
        this.saveController = undefined;
      }
      this.saveInFlight = false;
    }
  }

  override render() {
    return (
      <main>
        <h1>Items</h1>
        {!this.state.editing
          ? (
            <section aria-label="Item list">
              <p>{this.state.item.title}</p>
              <button type="button" onClick={() => this.edit()}>Edit</button>
            </section>
          )
          : (
            <form onSubmit={(event: SubmitEvent) => void this.save(event)}>
              <label for="item-title">Title</label>
              <input
                id="item-title"
                name="title"
                required
                defaultValue={this.state.draft}
                aria-invalid={this.state.fieldError ? "true" : "false"}
                aria-describedby={this.state.fieldError
                  ? "title-error"
                  : undefined}
              />
              {this.state.fieldError && (
                <p id="title-error" role="alert">{this.state.fieldError}</p>
              )}
              <button type="submit" disabled={this.state.saving}>
                {this.state.saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => this.cancel()}>
                {this.state.saving ? "Cancel save" : "Cancel"}
              </button>
            </form>
          )}
        <p role="status">{this.state.status}</p>
      </main>
    );
  }
}

Object.assign(globalThis, {
  mutationFlow: {
    mount() {
      document.body.replaceChildren(h(MutationFlowComponent, null));
    },
  },
});
