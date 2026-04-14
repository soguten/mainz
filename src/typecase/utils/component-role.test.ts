import { assert, assertEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";
import { findTypecaseRoleElements, hasTypecaseRole, markTypecaseRole } from "./component-role.ts";

await setupMainzDom();

Deno.test("typecase/component-role: marks element intent without changing CSS classes", () => {
    const element = document.createElement("div");

    assertEquals(hasTypecaseRole(element, "DropdownMenu.Content"), false);

    markTypecaseRole(element, "DropdownMenu.Content");

    assert(hasTypecaseRole(element, "DropdownMenu.Content"));
    assertEquals(element.getAttribute("class"), null);
});

Deno.test("typecase/component-role: does not treat CSS class names as roles", () => {
    const element = document.createElement("div");
    element.className = "tc-dropdown-menu-content";

    assertEquals(hasTypecaseRole(element, "DropdownMenu.Content"), false);
});

Deno.test("typecase/component-role: finds marked descendants by role", () => {
    const root = document.createElement("div");
    const element = document.createElement("button");

    root.appendChild(markTypecaseRole(element, "Modal.Close"));

    assertEquals(findTypecaseRoleElements(root, "Modal.Close"), [element]);
});
