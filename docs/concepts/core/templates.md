---
title: CLI Templates
summary: Understand how Mainz CLI templates use template.json, files directories, .tpl files, and token replacement.
---

Mainz CLI templates are small file templates used by scaffold-style commands.

The current built-in templates live under `templates/` in the Mainz repo:

```txt
templates/
  project/
    deno/
      empty/
      starter/
    node/
      empty/
      starter/
    bun/
  app/
    chart/
    default-routed/
    default-root/
  workflow/
    gh-pages/
```

Each template has a `template.json` manifest and a `files/` directory.

```txt
templates/
  app/
    default-routed/
      template.json
      files/
        index.html.tpl
        src/
          app.ts.tpl
          main.tsx.tpl
```

## template.json

`template.json` identifies the template. It must include `kind` and `name`.

```json
{
    "kind": "project",
    "name": "empty",
    "runtime": "deno"
}
```

Commands may read extra metadata from the rendered manifest. App templates use this to return the
target entry that `mainz app create` writes into `mainz.config.ts`.

```json
{
    "kind": "app",
    "name": "default-routed",
    "appType": "routed",
    "target": {
        "name": "{{appName}}",
        "rootDir": "{{rootDir}}",
        "appFile": "{{rootDir}}/src/app.ts",
        "appId": "{{appId}}",
        "outDir": "{{outDir}}"
    }
}
```

`kind` describes the CLI creation unit, such as `project`, `app`, or `workflow`. It is separate from
runtime values such as `deno` or `node`.

App templates may also declare runtime compatibility and dependencies:

```json
{
    "kind": "app",
    "name": "chart",
    "appType": "routed",
    "compatibility": {
        "runtimes": ["deno", "node"]
    },
    "dependencies": [
        {
            "specifier": "chart.js",
            "registry": "npm",
            "package": "chart.js",
            "version": "^4.5.1"
        }
    ]
}
```

`compatibility.runtimes` is optional. When present, `mainz app create` rejects the template if the
current project runtime is not listed.

`dependencies` and `devDependencies` are optional arrays. The initial supported registries are `npm`
and `jsr`. For Deno projects, Mainz registers the app in root `deno.json` `workspace` and writes
dependency groups to the app-level `deno.json` `imports`. npm dependencies are written as their main
`npm:` package specifier; Deno resolves package subpaths from that import. For Node projects, Mainz
registers the app in root `package.json` `workspaces` and writes `dependencies` and
`devDependencies` to the app-level `package.json`. JSR dependencies in Node projects are written
through the JSR npm compatibility registry.

## files/

The `files/` directory contains the files Mainz will generate.

Mainz renders every file path and every file body with simple token replacement:

```txt
{{appName}}
{{rootDir}}
{{outDir}}
```

If a template references a missing parameter, the command fails before writing the output.

## .tpl Files

Files that end in `.tpl` lose that suffix in the generated output.

```txt
files/deno.json.tpl -> deno.json
files/src/app.ts.tpl -> src/app.ts
files/.github/workflows/deploy-github-pages.yml.tpl -> .github/workflows/deploy-github-pages.yml
```

Files without `.tpl` keep their rendered path unchanged.

## How Commands Use Templates

`mainz init` uses `project/<runtime>/<template>` templates to create a runtime-specific project. The
default `empty` template creates only project files. `--template starter` creates project files plus
a routed app with a counter component.

`mainz app create` uses `app/<template>` templates to create app files. Without `--template`, it
selects a default app template from `--type`, defaulting to the routed scaffold (`default-routed`).
`--type root` selects `default-root`. When `--template <name|source>` is passed, the explicit
template name or source is used instead, and `--template` cannot be combined with `--type`.

After materializing the app template, Mainz writes the rendered target metadata into
`mainz.config.ts`. App templates are listed by name only; whether a template is routed or root-only
is internal template metadata.

## Template Sources

`--template` accepts either a built-in template name or a template source.

Built-in template names are resolved from the packaged catalog:

```bash
mainz init my-app --template starter
mainz app create docs --template default-routed
mainz app create analytics --template chart
```

Template sources let a project use a template outside the packaged catalog:

```bash
mainz init my-app --template ./templates/project-starter
mainz app create docs --template C:/templates/mainz/docs-app
mainz app create docs --template https://example.com/mainz/docs-app.tar.gz
```

A local template source is a directory with the same layout as a built-in template:

```txt
my-template/
  template.json
  files/
    ...
```

An HTTP template source points at a `.tar.gz` or `.tgz` archive, such as a repository archive URL
from GitHub, GitLab, or another host. Mainz downloads the archive, locates `template.json`, and then
uses the sibling `files/` directory inside that archive. Remote templates use the same manifest
shape as local templates; the manifest does not list generated files.

```txt
repo-archive/
  template.json
  files/
    index.html.tpl
    src/app.ts.tpl
```

Archives may contain a single top-level repository folder. Mainz uses the `files/` directory next to
the discovered `template.json`, so templates exported from repository archives do not need a cleanup
manifest or a generated file list.

`mainz workflow create gh-pages` and `mainz workflow update gh-pages` use the `workflow/gh-pages`
template to generate the GitHub Actions workflow file.

`mainz profile create` does not use a file template. It creates or updates a profile entry inside
`mainz.config.ts`.

## Adding a Built-In Template

To add a built-in template:

1. create `templates/project/<runtime>/<name>/template.json` for project templates, or
   `templates/app/<name>/template.json` for app templates
2. put generated files under that template's `files/` directory
3. use `{{paramName}}` tokens for values supplied by the CLI command
4. use `.tpl` on generated file names when the suffix should be stripped
5. declare `compatibility.runtimes` and template dependencies when the template needs runtime-aware
   workspace manifest updates
6. add focused tests for the command or template behavior

The template system is intentionally small. It does not currently include a template DSL,
conditional file inclusion, or dependency installation commands from the manifest. Template
dependencies update workspace manifests only; Mainz does not run package installation automatically.
