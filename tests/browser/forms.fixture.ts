import * as fixtures from "../../src/components/tests/component.forms.fixture.tsx";
import { h } from "../../src/jsx/dom-factory.ts";
import type { Component } from "../../src/components/component.ts";

if (!customElements.get("x-mainz-hydration-form")) {
  customElements.define(
    "x-mainz-hydration-form",
    fixtures.HydrationFormComponent,
  );
}

let component: Component;
Object.assign(globalThis, {
  forms: {
    mount(name: keyof typeof fixtures) {
      component = h(fixtures[name], null);
      document.body.replaceChildren(component);
    },
    update(state: Record<string, unknown>) {
      component.setState(state);
    },
    submissions() {
      return (component as fixtures.DefaultsFormComponent).submissions;
    },
  },
});
