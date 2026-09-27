/// <reference lib="deno.ns" />

import { assertEquals, assertStrictEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();
const fixtures = await import("./component.forms.fixture.tsx");

Deno.test("forms: JSX controlled fields follow empty and false state updates", () => {
  const screen = renderMainzComponent(fixtures.ControlledFormComponent);
  try {
    const input = screen.getBySelector<HTMLInputElement>("input[name=title]");
    const textarea = screen.getBySelector<HTMLTextAreaElement>("textarea");
    const checkbox = screen.getBySelector<HTMLInputElement>(
      "input[type=checkbox]",
    );
    assertEquals([input.value, textarea.value, checkbox.checked], [
      "initial",
      "initial",
      true,
    ]);
    input.value = "user edit";
    textarea.value = "user edit";
    screen.component.setState({ text: "", checked: false });
    assertEquals([input.value, textarea.value, checkbox.checked], [
      "",
      "",
      false,
    ]);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms: omitting controlled properties releases fields to the browser", () => {
  const screen = renderMainzComponent(fixtures.ControlledFormComponent);
  try {
    const input = screen.getBySelector<HTMLInputElement>("input[name=title]");
    const textarea = screen.getBySelector<HTMLTextAreaElement>("textarea");
    const checkbox = screen.getBySelector<HTMLInputElement>(
      "input[type=checkbox]",
    );
    input.value = "user edit";
    textarea.value = "user edit";
    checkbox.checked = false;
    screen.component.setState({ controlled: false });
    assertEquals([input.value, textarea.value, checkbox.checked], [
      "user edit",
      "user edit",
      false,
    ]);
    screen.component.setState({ controlled: true });
    assertEquals([input.value, textarea.value, checkbox.checked], [
      "initial",
      "initial",
      true,
    ]);
  } finally {
    screen.cleanup();
  }
});

for (const selector of ["input[name=title]", "textarea", "select"]) {
  Deno.test(`forms: unrelated render preserves uncontrolled ${selector}`, () => {
    const screen = renderMainzComponent(fixtures.NativeFormComponent);
    try {
      const control = screen.getBySelector<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >(selector);
      const value = selector === "select" ? "b" : "user edit";
      control.value = value;
      screen.component.setState({ count: 1 });
      assertStrictEquals(screen.getBySelector(selector), control);
      assertEquals(control.value, value);
    } finally {
      screen.cleanup();
    }
  });
}

Deno.test("forms: unrelated render preserves uncontrolled checkbox", () => {
  const screen = renderMainzComponent(fixtures.NativeFormComponent);
  try {
    const input = screen.getBySelector<HTMLInputElement>(
      "input[type=checkbox]",
    );
    input.checked = true;
    screen.component.setState({ count: 1 });
    assertEquals(input.checked, true);
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms: controlled select applies its initial value after options exist", () => {
  const screen = renderMainzComponent(fixtures.SelectFormComponent);
  try {
    assertEquals(screen.getBySelector<HTMLSelectElement>("select").value, "b");
  } finally {
    screen.cleanup();
  }
});

Deno.test("forms: controlled select follows state when options change", () => {
  const screen = renderMainzComponent(fixtures.SelectFormComponent);
  try {
    const select = screen.getBySelector<HTMLSelectElement>("select");
    screen.component.setState({ value: "c", options: ["b", "c", "a"] });
    assertStrictEquals(screen.getBySelector("select"), select);
    assertEquals(select.value, "c");
    screen.component.setState({ value: "a", options: ["c", "a"] });
    assertEquals(select.value, "a");
  } finally {
    screen.cleanup();
  }
});
