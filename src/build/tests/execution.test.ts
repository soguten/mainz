import { assertEquals } from "@std/assert";
import { resolveViteDevCommandArgs } from "../execution.ts";

Deno.test("build/execution: should forward dev host and port to Vite", () => {
    assertEquals(
        resolveViteDevCommandArgs("/tmp/vite.config.mjs", true, 4175),
        [
            "run",
            "-A",
            "npm:vite@7.3.1",
            "--config",
            "/tmp/vite.config.mjs",
            "--host",
            "--port",
            "4175",
        ],
    );
});
