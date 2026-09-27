import { Component } from "mainz";

export class HydrationFormComponent extends Component<
  Record<string, never>,
  { count: number }
> {
  protected override initState() {
    return { count: 0 };
  }

  override render() {
    return (
      <form>
        <input name="title" defaultValue="server value" />
        <textarea name="description" defaultValue="server description" />
        <output>{String(this.state.count)}</output>
      </form>
    );
  }
}

export class DefaultsFormComponent
  extends Component<Record<string, never>, { count: number }> {
  submissions = 0;
  protected override initState() {
    return { count: 0 };
  }
  override render() {
    return (
      <form
        onSubmit={(event: Event) => {
          event.preventDefault();
          this.submissions++;
        }}
      >
        <input name="title" defaultValue="initial" required />
        <textarea name="description" defaultValue="description" />
        <input name="enabled" type="checkbox" value="yes" defaultChecked />
        <input name="choice" type="radio" value="a" defaultChecked />
        <input name="choice" type="radio" value="b" />
        <select name="category" defaultValue="b">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
        <input name="ignored" value="ignored" disabled />
        <button type="submit">Save</button>
        <output>{String(this.state.count)}</output>
      </form>
    );
  }
}

export class FileFormComponent
  extends Component<Record<string, never>, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }
  override render() {
    return (
      <form>
        <input type="file" name="attachment" />
        <output>{String(this.state.count)}</output>
      </form>
    );
  }
}

export class ResetControlledFormComponent
  extends Component<Record<string, never>, { text: string }> {
  protected override initState() {
    return { text: "current" };
  }
  override render() {
    return (
      <form>
        <input value={this.state.text} defaultValue="baseline" />
        <textarea value={this.state.text} defaultValue="baseline" />
      </form>
    );
  }
}

export class MultipleFormComponent extends Component<
  Record<string, never>,
  { values: string[]; options: string[] }
> {
  protected override initState() {
    return { values: ["a", "c"], options: ["a", "b", "c"] };
  }
  override render() {
    return (
      <form>
        <select name="tags" multiple value={this.state.values}>
          {this.state.options.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </form>
    );
  }
}

export class DefaultMultipleFormComponent
  extends Component<Record<string, never>, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }
  override render() {
    return (
      <form>
        <select name="tags" multiple defaultValue={["a", "c"]}>
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>
        <output>{String(this.state.count)}</output>
      </form>
    );
  }
}

export class NativeFormComponent
  extends Component<Record<string, never>, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }

  override render() {
    return (
      <form>
        <input name="title" />
        <input name="enabled" type="checkbox" />
        <textarea name="description" />
        <select name="category">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
        <output>{String(this.state.count)}</output>
      </form>
    );
  }
}

export class SelectFormComponent extends Component<
  Record<string, never>,
  { value: string; options: string[] }
> {
  protected override initState() {
    return { value: "b", options: ["a", "b"] };
  }

  override render() {
    return (
      <select value={this.state.value}>
        {this.state.options.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
    );
  }
}

export class ControlledFormComponent extends Component<
  Record<string, never>,
  { text: string; checked: boolean; controlled: boolean }
> {
  protected override initState() {
    return { text: "initial", checked: true, controlled: true };
  }

  override render() {
    const value = this.state.controlled ? { value: this.state.text } : {};
    const checked = this.state.controlled
      ? { checked: this.state.checked }
      : {};
    return (
      <form>
        <input name="title" {...value} />
        <textarea {...value} />
        <input type="checkbox" {...checked} />
      </form>
    );
  }
}

export class SubmissionFormComponent
  extends Component<Record<string, never>, { count: number }> {
  protected override initState() {
    return { count: 0 };
  }
  override render() {
    return (
      <form
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const data = new FormData(form, event.submitter as HTMLButtonElement);
          const output = form.querySelector("output")!;
          output.textContent = JSON.stringify(Array.from(data.entries()));
          output.setAttribute(
            "data-submissions",
            String(Number(output.getAttribute("data-submissions") ?? 0) + 1),
          );
        }}
      >
        <input name="code" required pattern="[A-Z]{3}" defaultValue="ABC" />
        <input
          name="quantity"
          type="number"
          min="2"
          max="6"
          step="2"
          defaultValue="2"
        />
        <fieldset disabled>
          <input name="excluded" defaultValue="hidden" />
        </fieldset>
        <input name="unchecked" type="checkbox" />
        <button name="action" value="save" type="submit">Save</button>
        <button name="action" value="draft" type="submit" formNoValidate>
          Draft
        </button>
        <output />
        <span>{String(this.state.count)}</span>
      </form>
    );
  }
}

export class KeyedFormComponent extends Component<
  Record<string, never>,
  { order: string[] }
> {
  protected override initState() {
    return { order: ["a", "b", "c"] };
  }
  override render() {
    return (
      <form>
        {this.state.order.map((name) => (
          <input key={name} name={name} defaultValue={name} />
        ))}
      </form>
    );
  }
}
