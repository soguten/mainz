/// <reference lib="deno.ns" />

import { assert, assertEquals, assertThrows } from "@std/assert";

async function setupCommandRuntimeTest() {
  const { setupMainzDom } = await import("mainz/testing");
  await setupMainzDom();

  const mainz = await import("mainz");
  const fixtures = await import(
    "./command.runtime.fixture.tsx"
  ) as typeof import("./command.runtime.fixture.tsx");

  fixtures.resetCommandFixtures();
  return {
    fixtures,
    listCommands: mainz.listCommands,
    runCommand: mainz.runCommand,
    startApp: mainz.startApp,
  };
}

function dispatchShortcut(target: HTMLElement, args: {
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
}): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: args.ctrlKey,
      key: args.key,
      metaKey: args.metaKey,
    }),
  );
}

Deno.test({
  name:
    "commands/runtime: each started app should dispatch shortcuts within its own app registry",
  async fn() {
    const { fixtures, startApp } = await setupCommandRuntimeTest();
    document.body.innerHTML = `<div id="left"></div><div id="right"></div>`;

    const leftController = startApp(fixtures.LeftCommandApp, {
      mount: "#left",
    });
    const rightController = startApp(fixtures.RightCommandApp, {
      mount: "#right",
    });

    try {
      assert(fixtures.leftButton);
      assert(fixtures.rightButton);

      dispatchShortcut(fixtures.leftButton, { ctrlKey: true, key: "k" });
      dispatchShortcut(fixtures.rightButton, { ctrlKey: true, key: "k" });

      assertEquals(fixtures.commandLog, ["left", "right"]);
    } finally {
      leftController.cleanup();
      rightController.cleanup();
    }
  },
});

Deno.test({
  name:
    "commands/runtime: command when predicates should gate shortcut execution",
  async fn() {
    const { fixtures, startApp } = await setupCommandRuntimeTest();
    document.body.innerHTML = `<div id="app"></div>`;

    const controller = startApp(fixtures.GuardedCommandApp, { mount: "#app" });

    try {
      assert(fixtures.guardedButton);
      dispatchShortcut(fixtures.guardedButton, { ctrlKey: true, key: "k" });
      assertEquals(fixtures.commandLog, []);

      const enableButton = document.querySelector<HTMLButtonElement>(
        "[data-testid='enable-guard']",
      );
      assert(enableButton);
      enableButton.click();

      dispatchShortcut(fixtures.guardedButton, { ctrlKey: true, key: "k" });
      assertEquals(fixtures.commandLog, ["guarded"]);
    } finally {
      controller.cleanup();
    }
  },
});

Deno.test({
  name:
    "commands/runtime: runCommand should execute stable app commands by explicit app id and return false when when rejects",
  async fn() {
    const { fixtures, runCommand, startApp } = await setupCommandRuntimeTest();
    document.body.innerHTML = `<div id="app"></div>`;

    const controller = startApp(fixtures.StableCommandApp, { mount: "#app" });

    try {
      assertEquals(
        runCommand<string>("stable.search.open", {
          appId: "stable-app",
          payload: "routing",
        }),
        true,
      );
      assertEquals(
        runCommand("stable.selection.bold", {
          appId: "stable-app",
          payload: "missing-selection",
        }),
        false,
      );
      assertEquals(fixtures.commandLog, ["stable:routing"]);

      assertThrows(() =>
        runCommand("missing.command", { appId: "stable-app" })
      );
    } finally {
      controller.cleanup();
    }
  },
});

Deno.test({
  name:
    "commands/runtime: runCommand should use the single active app as a detached fallback and throw when multiple apps are active",
  async fn() {
    const { fixtures, runCommand, startApp } = await setupCommandRuntimeTest();
    document.body.innerHTML = `<div id="app"></div>`;

    const controller = startApp(fixtures.StableCommandApp, { mount: "#app" });

    try {
      assertEquals(
        runCommand<string>("stable.search.open", {
          payload: "fallback",
        }),
        true,
      );
      assertEquals(fixtures.commandLog, ["stable:fallback"]);
    } finally {
      controller.cleanup();
    }

    fixtures.resetCommandFixtures();
    document.body.innerHTML = `<div id="left"></div><div id="right"></div>`;

    const leftController = startApp(fixtures.LeftCommandApp, {
      mount: "#left",
    });
    const rightController = startApp(fixtures.RightCommandApp, {
      mount: "#right",
    });

    try {
      assertThrows(() => runCommand("docs.search.open"));
    } finally {
      leftController.cleanup();
      rightController.cleanup();
    }
  },
});

Deno.test({
  name:
    "commands/runtime: listCommands should enumerate commands for the resolved app",
  async fn() {
    const { fixtures, listCommands, startApp } =
      await setupCommandRuntimeTest();
    document.body.innerHTML = `<div id="app"></div>`;

    const controller = startApp(fixtures.StableCommandApp, { mount: "#app" });

    try {
      assertEquals(
        listCommands({ appId: "stable-app" }),
        [
          {
            appId: "stable-app",
            description: "Open the stable command search flow.",
            id: "stable.search.open",
            shortcuts: ["Mod+K"],
            title: "Open stable search",
          },
          {
            appId: "stable-app",
            description: undefined,
            id: "stable.selection.bold",
            shortcuts: ["Mod+B"],
            title: undefined,
          },
        ],
      );
    } finally {
      controller.cleanup();
    }
  },
});

Deno.test({
  name:
    "commands/runtime: duplicate command ids should fail within the same app",
  async fn() {
    const { fixtures, startApp } = await setupCommandRuntimeTest();
    document.body.innerHTML = `<div id="app"></div>`;

    assertThrows(() => {
      const controller = startApp(fixtures.DuplicateCommandApp, {
        mount: "#app",
      });
      controller.cleanup();
    });
  },
});
