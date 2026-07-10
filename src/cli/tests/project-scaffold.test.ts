/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { denoToolingRuntime } from "../../tooling/runtime/deno.ts";
import { builtInTemplateManifest } from "../templates/built-in-template-manifest.ts";
import {
  builtInTemplateExists,
  instantiateTemplate,
  joinTemplateRoot,
  listBuiltInTemplateNames,
  loadTemplate,
  materializeTemplate,
  resolveBuiltInTemplateRoot,
  resolveBuiltInTemplatesRootFromModuleUrl,
} from "../templates/index.ts";

Deno.test("cli/templates: should read built-in templates from the filesystem tree", async () => {
  const expectations = [
    ["app", "chart"],
    ["app", "default-root"],
    ["app", "default-routed"],
    ["container", "dockerignore"],
    ["container", "deno/browser"],
    ["container", "deno/server"],
    ["container", "node/browser"],
    ["project", "deno/empty"],
    ["project", "deno/starter"],
    ["project", "node/empty"],
    ["project", "node/starter"],
    ["workflow", "gh-pages"],
  ] as const;

  for (const [kind, name] of expectations) {
    const templateDir = resolve("templates", kind, ...name.split("/"));
    const template = await loadTemplateFromTree(templateDir);

    assertEquals(template, {
      manifestSource: template.manifestSource,
      files: template.files,
    }, `Filesystem template drift for ${kind}/${name}`);
  }
});

Deno.test("cli/templates: built-in template manifest should match the filesystem tree", async () => {
  const entries = Object.entries(builtInTemplateManifest).sort((
    [left],
    [right],
  ) => left.localeCompare(right));

  const expected = await Promise.all(entries.map(async ([templateKey]) => {
    const [kind, ...nameParts] = templateKey.split("/");
    const templateDir = resolve("templates", kind, ...nameParts);
    const template = await loadTemplateFromTree(templateDir);
    return [
      templateKey,
      template.files.map((file) => file.path).sort(),
    ] as const;
  }));

  assertEquals(
    entries.map(([templateKey, files]) =>
      [templateKey, [...files].sort()] as const
    ),
    expected,
  );
});

Deno.test("cli/templates: built-in helper functions should resolve and enumerate names", () => {
  const projectRoot = resolveBuiltInTemplateRoot("project", ".");
  const appRoot = resolveBuiltInTemplateRoot("app", ".");
  const denoProjectRoot = joinTemplateRoot(projectRoot, "deno");
  const starterTemplateRoot = joinTemplateRoot(denoProjectRoot, "starter");

  assertEquals(listBuiltInTemplateNames(projectRoot), ["deno", "node"]);
  assertEquals(listBuiltInTemplateNames(appRoot), [
    "chart",
    "default-root",
    "default-routed",
  ]);
  assertEquals(listBuiltInTemplateNames(denoProjectRoot), ["empty", "starter"]);
  assertEquals(builtInTemplateExists(starterTemplateRoot), true);
  assertEquals(
    builtInTemplateExists(joinTemplateRoot(denoProjectRoot, "missing")),
    false,
  );
});

Deno.test("cli/templates: should resolve built-in template roots from remote module URLs", () => {
  const remoteTemplatesRoot = resolveBuiltInTemplatesRootFromModuleUrl(
    "https://jsr.io/@mainz/mainz/0.1.0-alpha.58/src/cli/templates/load-template.ts",
  );

  assertEquals(
    remoteTemplatesRoot,
    "https://jsr.io/@mainz/mainz/0.1.0-alpha.58/templates/",
  );
  assertEquals(
    joinTemplateRoot(remoteTemplatesRoot, "project/deno/starter"),
    "https://jsr.io/@mainz/mainz/0.1.0-alpha.58/templates/project/deno/starter",
  );
  assertEquals(
    builtInTemplateExists(
      "https://jsr.io/@mainz/mainz/0.1.0-alpha.58/templates/project/deno/starter",
    ),
    true,
  );
  assertEquals(
    listBuiltInTemplateNames(
      "https://jsr.io/@mainz/mainz/0.1.0-alpha.58/templates/project",
    ),
    ["deno", "node"],
  );
});

Deno.test("cli/templates/project: empty deno should materialize the shared project template", async () => {
  const plan = await instantiateTemplate({
    runtime: denoToolingRuntime,
    templateRoot: resolveBuiltInTemplateRoot("project", "deno/empty"),
    params: {
      projectName: "demo",
      mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
      denoConfigPath: "deno.json",
      mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
      mainzToolingCliSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99/tooling/cli",
      mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
    },
  });

  assertEquals(
    plan.files.map((file) => file.path).sort(),
    [".gitignore", "README.md", "deno.json", "mainz.config.ts"],
  );

  const config = plan.files.find((file) => file.path === "mainz.config.ts");
  assertStringIncludes(config?.content ?? "", 'runtime: "deno"');
  const gitignore = plan.files.find((file) => file.path === ".gitignore");
  assertStringIncludes(gitignore?.content ?? "", ".mainz_temp/");
  assertStringIncludes(gitignore?.content ?? "", "node_modules/");

  const denoConfig = plan.files.find((file) => file.path === "deno.json");
  assertStringIncludes(
    denoConfig?.content ?? "",
    '"mainz": "jsr:@mainz/mainz@0.1.0-alpha.99"',
  );
  const readme = plan.files.find((file) => file.path === "README.md");
  assertStringIncludes(readme?.content ?? "", "deno install");
  assertStringIncludes(
    readme?.content ?? "",
    "deno task mainz app create my-app",
  );
  assertStringIncludes(readme?.content ?? "", "deno task dev --target my-app");
});

Deno.test("cli/templates/project: starter deno should materialize a routed app with a counter", async () => {
  const plan = await instantiateTemplate({
    runtime: denoToolingRuntime,
    templateRoot: resolveBuiltInTemplateRoot("project", "deno/starter"),
    params: {
      mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
      denoConfigPath: "deno.json",
      mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
      mainzToolingCliSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99/tooling/cli",
      mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
      projectName: "demo",
      appName: "app",
      appId: "app",
      appNavigation: "spa",
      appTitle: "demo",
      customElementPrefix: "x-mainz-demo",
      rootDir: "./app",
      outDir: "dist/app",
    },
  });
  const files = new Map(
    plan.files.map((file) => [file.path.replaceAll("\\", "/"), file]),
  );

  assertEquals(
    [...files.keys()].sort(),
    [
      ".gitignore",
      "README.md",
      "app/deno.json",
      "app/index.html",
      "app/src/app.ts",
      "app/src/components/Counter.tsx",
      "app/src/main.tsx",
      "app/src/pages/Home.page.tsx",
      "app/src/pages/NotFound.page.tsx",
      "deno.json",
      "mainz.config.ts",
    ],
  );

  const config = files.get("mainz.config.ts");
  assertStringIncludes(config?.content ?? "", 'runtime: "deno"');
  assertStringIncludes(config?.content ?? "", 'name: "app"');
  assertStringIncludes(config?.content ?? "", 'appFile: "./app/src/app.ts"');
  const appDenoConfig = files.get("app/deno.json");
  assertStringIncludes(appDenoConfig?.content ?? "", '"extends": "../deno.json"');
  const gitignore = files.get(".gitignore");
  assertStringIncludes(gitignore?.content ?? "", ".mainz_temp/");
  assertStringIncludes(gitignore?.content ?? "", "node_modules/");

  const homePage = files.get("app/src/pages/Home.page.tsx");
  assertStringIncludes(
    homePage?.content ?? "",
    'import { Counter } from "../components/Counter.tsx";',
  );
  assertStringIncludes(homePage?.content ?? "", "<Counter />");

  const counter = files.get("app/src/components/Counter.tsx");
  assertEquals(counter?.content.includes("@CustomElement"), false);
  assertStringIncludes(
    counter?.content ?? "",
    'import { Component, type NoProps } from "mainz";',
  );
  assertStringIncludes(
    counter?.content ?? "",
    "extends Component<NoProps, CounterState>",
  );
  assertStringIncludes(
    counter?.content ?? "",
    "this.setState({ count: this.state.count + 1 })",
  );
  const readme = files.get("README.md");
  assertStringIncludes(readme?.content ?? "", "deno install");
  assertStringIncludes(readme?.content ?? "", "deno task dev --target app");
  assertStringIncludes(
    readme?.content ?? "",
    "deno task mainz app create my-app",
  );
});

Deno.test("cli/templates/project: starter node should use node-compatible workspace paths", async () => {
  const plan = await instantiateTemplate({
    runtime: denoToolingRuntime,
    templateRoot: resolveBuiltInTemplateRoot("project", "node/starter"),
    params: {
      mainzSpecifier: "npm:@jsr/mainz__mainz@0.1.0-alpha.99",
      denoConfigPath: "deno.json",
      mainzCliSpecifier: "npm:@jsr/mainz__mainz@0.1.0-alpha.99",
      mainzToolingCliSpecifier:
        "npm:@jsr/mainz__mainz@0.1.0-alpha.99/tooling/cli",
      mainzSubpathPrefix: "npm:@jsr/mainz__mainz@0.1.0-alpha.99/",
      projectName: "demo",
      appName: "app",
      appId: "app",
      appNavigation: "spa",
      appTitle: "demo",
      customElementPrefix: "x-mainz-demo",
      rootDir: "./app",
      outDir: "dist/app",
    },
  });
  const files = new Map(
    plan.files.map((file) => [file.path.replaceAll("\\", "/"), file]),
  );

  assertEquals(
    [...files.keys()].sort(),
    [
      ".gitignore",
      ".npmrc",
      "README.md",
      "app/index.html",
      "app/package.json",
      "app/src/app.ts",
      "app/src/components/Counter.tsx",
      "app/src/main.tsx",
      "app/src/pages/Home.page.tsx",
      "app/src/pages/NotFound.page.tsx",
      "mainz.config.ts",
      "package.json",
      "scripts/mainz.mjs",
      "tsconfig.json",
    ],
  );

  const packageJson = JSON.parse(files.get("package.json")?.content ?? "{}");
  assertEquals(packageJson.workspaces, ["app"]);
  assertEquals(packageJson.scripts?.mainz, "node ./scripts/mainz.mjs");
  assertEquals(packageJson.scripts?.dev, "npm run mainz -- dev");
  const gitignore = files.get(".gitignore");
  assertStringIncludes(gitignore?.content ?? "", ".mainz_temp/");
  assertStringIncludes(gitignore?.content ?? "", "node_modules/");

  const launcher = files.get("scripts/mainz.mjs");
  assertStringIncludes(launcher?.content ?? "", 'from "mainz/tooling/cli"');
  const readme = files.get("README.md");
  assertStringIncludes(readme?.content ?? "", "npm install");
  assertStringIncludes(readme?.content ?? "", "npm run dev -- --target app");
  assertStringIncludes(
    readme?.content ?? "",
    "npm run mainz -- app create my-app",
  );
});

Deno.test("cli/templates: should load built-in templates from a remote URL tree", async () => {
  const portListener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const port = (portListener.addr as Deno.NetAddr).port;
  portListener.close();
  const abortController = new AbortController();
  const server = Deno.serve({
    hostname: "127.0.0.1",
    port,
    signal: abortController.signal,
  }, async (request) => {
    const url = new URL(request.url);
    const relativePath = url.pathname.replace(/^\/+/, "");
    const absolutePath = resolve(relativePath);

    try {
      const content = await Deno.readTextFile(absolutePath);
      return new Response(content, { status: 200 });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response("Not found", { status: 404 });
      }

      throw error;
    }
  });

  try {
    const remoteTemplateRoot =
      `http://127.0.0.1:${port}/templates/project/deno/starter`;
    const template = await loadTemplate(remoteTemplateRoot, denoToolingRuntime);
    assertEquals(
      template.filePaths,
      builtInTemplateManifest["project/deno/starter"],
    );

    const plan = await instantiateTemplate({
      runtime: denoToolingRuntime,
      templateRoot: remoteTemplateRoot,
      params: {
        mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
        denoConfigPath: "deno.json",
        mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
        mainzToolingCliSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99/tooling/cli",
        mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
        projectName: "demo",
        appName: "app",
        appId: "app",
        appNavigation: "spa",
        appTitle: "demo",
        customElementPrefix: "x-mainz-demo",
        rootDir: "./app",
        outDir: "dist/app",
      },
    });
    const files = new Map(
      plan.files.map((file) => [file.path.replaceAll("\\", "/"), file.content]),
    );

    assertStringIncludes(files.get("mainz.config.ts") ?? "", 'runtime: "deno"');
    assertStringIncludes(
      files.get("app/src/pages/Home.page.tsx") ?? "",
      "override metadata()",
    );
  } finally {
    abortController.abort();
    await server.finished;
  }
});

Deno.test("cli/templates: should load remote built-in templates with dotfiles", async () => {
  const portListener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const port = (portListener.addr as Deno.NetAddr).port;
  portListener.close();
  const abortController = new AbortController();
  const server = Deno.serve({
    hostname: "127.0.0.1",
    port,
    signal: abortController.signal,
  }, async (request) => {
    const url = new URL(request.url);
    const relativePath = url.pathname.replace(/^\/+/, "");
    const absolutePath = resolve(relativePath);

    try {
      const content = await Deno.readTextFile(absolutePath);
      return new Response(content, { status: 200 });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response("Not found", { status: 404 });
      }

      throw error;
    }
  });

  try {
    const containerTemplate = await loadTemplate(
      `http://127.0.0.1:${port}/templates/container/dockerignore`,
      denoToolingRuntime,
    );
    assertEquals(
      containerTemplate.filePaths,
      builtInTemplateManifest["container/dockerignore"],
    );
    assertEquals(containerTemplate.files?.map((file) => file.path), [
      ".dockerignore.tpl",
    ]);
    assertStringIncludes(
      containerTemplate.files?.[0]?.content ?? "",
      "node_modules/",
    );
    assertStringIncludes(containerTemplate.files?.[0]?.content ?? "", ".git/");

    const projectTemplate = await loadTemplate(
      `http://127.0.0.1:${port}/templates/project/deno/empty`,
      denoToolingRuntime,
    );
    assertEquals(
      projectTemplate.filePaths,
      builtInTemplateManifest["project/deno/empty"],
    );
    assertEquals(
      projectTemplate.files?.find((file) => file.path === ".gitignore.tpl")
        ?.content,
      ".mainz_temp/\nnode_modules/\ndist/\n",
    );
  } finally {
    abortController.abort();
    await server.finished;
  }
});

Deno.test("cli/templates/app: default-routed should render shared target metadata", async () => {
  const plan = await instantiateTemplate({
    runtime: denoToolingRuntime,
    templateRoot: resolveBuiltInTemplateRoot("app", "default-routed"),
    params: {
      appName: "site",
      appId: "site",
      appNavigation: "spa",
      appTitle: "site",
      customElementPrefix: "x-mainz-site",
      rootDir: "./site",
      outDir: "dist/site",
    },
  });

  assertEquals(plan.manifest.target, {
    name: "site",
    rootDir: "./site",
    appFile: "./site/src/app.ts",
    appId: "site",
    outDir: "dist/site",
  });
});

Deno.test("cli/templates/project: materialize should preflight every destination before writing", async () => {
  const outputDir = await Deno.makeTempDir({
    prefix: "mainz-template-preflight-",
  });

  try {
    await assertRejects(
      () =>
        materializeTemplate({
          runtime: denoToolingRuntime,
          templateRoot: resolveBuiltInTemplateRoot("project", "deno/empty"),
          outputDir,
          params: {
            projectName: "demo",
            mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
            denoConfigPath: "deno.json",
            mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
            mainzToolingCliSpecifier:
              "jsr:@mainz/mainz@0.1.0-alpha.99/tooling/cli",
            mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
          },
          async beforeWrite(path) {
            if (path.endsWith("mainz.config.ts")) {
              throw new Error("Refusing to overwrite existing file");
            }
          },
        }),
      Error,
      "Refusing to overwrite existing file",
    );

    await assertRejects(
      () => Deno.stat(resolve(outputDir, "mainz.config.ts")),
      Deno.errors.NotFound,
    );
    await assertRejects(
      () => Deno.stat(resolve(outputDir, "deno.json")),
      Deno.errors.NotFound,
    );
  } finally {
    await Deno.remove(outputDir, { recursive: true });
  }
});

async function collectFiles(
  root: string,
  prefix = "",
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  for await (const entry of Deno.readDir(root)) {
    const absolutePath = resolve(root, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      files.push(...await collectFiles(absolutePath, relativePath));
      continue;
    }

    files.push({
      path: relativePath.replaceAll("\\", "/"),
      content: normalizeLineEndings(await Deno.readTextFile(absolutePath)),
    });
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

async function loadTemplateFromTree(templateRoot: string): Promise<{
  manifestSource: string;
  files: Array<{ path: string; content: string }>;
}> {
  return {
    manifestSource: normalizeLineEndings(
      await Deno.readTextFile(resolve(templateRoot, "template.json")),
    ),
    files: await collectFiles(resolve(templateRoot, "files")),
  };
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll("\r\n", "\n");
}
