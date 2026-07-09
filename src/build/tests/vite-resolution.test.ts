import { resolve } from "node:path";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { assert } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { DenoToolingRuntime } from "../../tooling/runtime/index.ts";
import { resolveMainzTempPath } from "../../tooling/temp-paths.ts";
import { resolveViteConfigArtifact } from "../vite-resolution.ts";

Deno.test("build/vite-resolution: should pass through explicit viteConfig paths", async () => {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-vite-resolution-explicit-",
  });

  try {
    const runtime = new DenoToolingRuntime();
    await Deno.mkdir(resolve(cwd, "site"), { recursive: true });
    await Deno.writeTextFile(
      resolve(cwd, "site", "vite.config.ts"),
      [
        "// @mainz-materialized-vite-config",
        "export default {};",
        "",
      ].join("\n"),
    );
    const config = normalizeMainzConfig({
      targets: [
        {
          name: "site",
          rootDir: "./site",
          viteConfig: "./site/vite.config.ts",
        },
      ],
    });

    const resolved = await resolveViteConfigArtifact({
      runtime,
      cwd,
      target: config.targets[0]!,
      outputDir: "dist/site",
      navigationMode: "spa",
      basePath: "/",
      appLocales: [],
      localePrefix: "except-default",
    });

    assertEquals(
      resolved.path,
      resolve(cwd, "site", "vite.config.ts").replaceAll("\\", "/"),
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("build/vite-resolution: should resolve generated Vite configs into .mainz_temp", async () => {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-vite-resolution-generated-",
  });

  try {
    const runtime = new DenoToolingRuntime();
    const config = normalizeMainzConfig({
      targets: [
        {
          name: "site",
          rootDir: "./site",
        },
      ],
    });

    const resolved = await resolveViteConfigArtifact({
      runtime,
      cwd,
      target: config.targets[0]!,
      outputDir: "dist/site",
      navigationMode: "mpa",
      basePath: "./",
      appLocales: ["en"],
      defaultLocale: "en",
      localePrefix: "except-default",
      siteUrl: "https://example.com",
      devSsgDebug: true,
    });

    assertEquals(
      resolved.path,
      resolveMainzTempPath(
        cwd,
        "vite-configs",
        "site",
        "deno",
        "vite.config.ts",
      )
        .replaceAll("\\", "/"),
    );
    assertStringIncludes(
      await Deno.readTextFile(resolved.path),
      JSON.stringify(
        resolveMainzTempPath(cwd, "vite-cache", "site").replaceAll("\\", "/"),
      ),
    );
    await assertRejectsNotFound(resolve(cwd, "site", "vite.config.ts"));
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("build/vite-resolution: should reject unmanaged explicit viteConfig paths", async () => {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-vite-resolution-unmanaged-",
  });

  try {
    const runtime = new DenoToolingRuntime();
    await Deno.mkdir(resolve(cwd, "site"), { recursive: true });
    await Deno.writeTextFile(
      resolve(cwd, "site", "vite.config.ts"),
      'import { defineConfig } from "vite";\nexport default defineConfig({});\n',
    );
    const config = normalizeMainzConfig({
      targets: [
        {
          name: "site",
          rootDir: "./site",
          viteConfig: "./site/vite.config.ts",
        },
      ],
    });

    try {
      await resolveViteConfigArtifact({
        runtime,
        cwd,
        target: config.targets[0]!,
        outputDir: "dist/site",
        navigationMode: "spa",
        basePath: "/",
        appLocales: [],
        localePrefix: "except-default",
      });
    } catch (error) {
      assert(error instanceof Error);
      assertStringIncludes(error.message, "is not a Mainz-managed Vite config");
      return;
    }

    throw new Error("Expected unmanaged explicit viteConfig to be rejected.");
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

async function assertRejectsNotFound(path: string): Promise<void> {
  try {
    await Deno.stat(path);
  } catch (error) {
    assert(error instanceof Deno.errors.NotFound);
    return;
  }

  throw new Error(`Expected "${path}" to be absent.`);
}
