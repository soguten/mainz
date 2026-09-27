/// <reference lib="deno.ns" />
import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";
await setupMainzDom();
const fixtures = await import("./component.forms.fixture.tsx");

function data(form: HTMLFormElement) {
  return new form.ownerDocument.defaultView!.FormData(form);
}
function selected(select: HTMLSelectElement) {
  return Array.from(select.options).filter((option) => option.selected).map(
    (option) => option.value,
  );
}

Deno.test("forms/native: selected files survive unrelated render and enter FormData", () => {
  const screen = renderMainzComponent(fixtures.FileFormComponent);
  try {
    const input = screen.getBySelector<HTMLInputElement>("input");
    const win = input.ownerDocument.defaultView!;
    const transfer = new win.DataTransfer();
    transfer.items.add(
      new win.File(["hello"], "hello.txt", { type: "text/plain" }),
    );
    input.files = transfer.files;
    screen.component.setState({ count: 1 });
    assertEquals(input.files?.[0].name, "hello.txt");
    const attachment = data(screen.getBySelector<HTMLFormElement>("form")).get(
      "attachment",
    ) as File;
    assertEquals([attachment.name, attachment.size], ["hello.txt", 5]);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms/native: controlled value overrides default and next render restores state after native reset", () => {
  const screen = renderMainzComponent(fixtures.ResetControlledFormComponent);
  try {
    const input = screen.getBySelector<HTMLInputElement>("input");
    const textarea = screen.getBySelector<HTMLTextAreaElement>("textarea");
    assertEquals([input.value, textarea.value], ["current", "current"]);
    screen.getBySelector<HTMLFormElement>("form").reset();
    assertEquals([input.value, textarea.value], ["baseline", "baseline"]);
    screen.component.setState({ text: "next" });
    assertEquals([input.value, textarea.value], ["next", "next"]);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms/native: defaults participate in FormData and disabled fields are excluded", () => {
  const screen = renderMainzComponent(fixtures.DefaultsFormComponent);
  try {
    const form = screen.getBySelector<HTMLFormElement>("form");
    assertEquals(Array.from(data(form).entries()), [
      ["title", "initial"],
      ["description", "description"],
      ["enabled", "yes"],
      ["choice", "a"],
      ["category", "b"],
    ]);
    assertEquals(form.querySelector("[defaultvalue], [defaultchecked]"), null);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms/native: edits survive rerender and reset restores defaults", () => {
  const screen = renderMainzComponent(fixtures.DefaultsFormComponent);
  try {
    const form = screen.getBySelector<HTMLFormElement>("form");
    const input = screen.getBySelector<HTMLInputElement>("input[name=title]");
    const textarea = screen.getBySelector<HTMLTextAreaElement>("textarea");
    const checkbox = screen.getBySelector<HTMLInputElement>(
      "input[type=checkbox]",
    );
    const radio = screen.getBySelector<HTMLInputElement>(
      "input[type=radio][value=b]",
    );
    const select = screen.getBySelector<HTMLSelectElement>("select");
    input.value = "edited";
    textarea.value = "edited description";
    checkbox.checked = false;
    radio.click();
    select.value = "a";
    screen.component.setState({ count: 1 });
    assertEquals([
      input.value,
      textarea.value,
      checkbox.checked,
      radio.checked,
      select.value,
    ], ["edited", "edited description", false, true, "a"]);
    form.reset();
    assertEquals([
      input.value,
      textarea.value,
      checkbox.checked,
      radio.checked,
      select.value,
    ], ["initial", "description", true, false, "b"]);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms/native: multiple select controls every selection through option changes", () => {
  const screen = renderMainzComponent(fixtures.MultipleFormComponent);
  try {
    const select = screen.getBySelector<HTMLSelectElement>("select");
    assertEquals(selected(select), ["a", "c"]);
    // Multiple-value FormData is verified in the browser suite: Happy DOM
    // 20.9.0 collects only select.value instead of all selected options.
    screen.component.setState({ values: ["b", "d"], options: ["d", "c", "b"] });
    assertEquals(selected(select), ["d", "b"]);
    screen.component.setState({ values: [] });
    assertEquals(selected(select), []);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms/native: uncontrolled multiple select retains edits and reset attributes", () => {
  const screen = renderMainzComponent(fixtures.DefaultMultipleFormComponent);
  try {
    const select = screen.getBySelector<HTMLSelectElement>("select");
    assertEquals(selected(select), ["a", "c"]);
    for (const option of select.options) option.selected = option.value === "b";
    screen.component.setState({ count: 1 });
    assertEquals(selected(select), ["b"]);
    // Native multiple-select reset is covered in the browser suite. Happy DOM
    // 20.9.0 restores only the first selected attribute.
    assertEquals(
      Array.from(select.options).filter((option) =>
        option.hasAttribute("selected")
      ).map((option) => option.value),
      ["a", "c"],
    );
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms/native: validation blocks invalid submit and listener stays unique after renders", () => {
  const screen = renderMainzComponent(fixtures.DefaultsFormComponent);
  try {
    const form = screen.getBySelector<HTMLFormElement>("form");
    const input = screen.getBySelector<HTMLInputElement>("input[name=title]");
    input.value = "";
    assertEquals(form.checkValidity(), false);
    form.requestSubmit();
    assertEquals(screen.component.submissions, 0);
    input.value = "valid";
    input.setCustomValidity("server error");
    assertEquals(form.checkValidity(), false);
    input.setCustomValidity("");
    screen.component.setState({ count: 1 });
    screen.component.setState({ count: 2 });
    assertEquals(form.checkValidity(), true);
    form.requestSubmit();
    assertEquals(screen.component.submissions, 1);
  } finally {
    screen.cleanup();
  }
});
