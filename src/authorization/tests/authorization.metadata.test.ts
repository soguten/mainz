/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
  AllowAnonymous,
  Authorize,
  resolveComponentAuthorization,
  resolvePageAuthorization,
} from "../index.ts";
import { Component, Page } from "../../components/index.ts";

Deno.test("authorization/metadata: should store page authorization decorators as page metadata", () => {
  @AllowAnonymous()
  @Authorize({ roles: ["admin", " editor "], policy: "org-member" })
  class AuthorizedPage extends Page {
    override render(): HTMLElement {
      return document.createElement("main");
    }
  }

  assertEquals(resolvePageAuthorization(AuthorizedPage), {
    allowAnonymous: true,
    requirement: {
      authenticated: true,
      roles: ["admin", "editor"],
      policy: "org-member",
    },
  });
});

Deno.test("authorization/metadata: should store component authorization without allow-anonymous metadata", () => {
  @Authorize()
  class AuthorizedComponent extends Component {
    override render(): HTMLElement {
      return document.createElement("section");
    }
  }

  assertEquals(resolveComponentAuthorization(AuthorizedComponent), {
    requirement: {
      authenticated: true,
      roles: undefined,
      policy: undefined,
    },
  });
  assertEquals(resolvePageAuthorization(AuthorizedComponent), {
    allowAnonymous: undefined,
    requirement: {
      authenticated: true,
      roles: undefined,
      policy: undefined,
    },
  });
});
