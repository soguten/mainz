---
title: CLI Templates
summary: Understand how Mainz CLI templates use template.json, files directories, .tpl files, and token replacement.
---

Mainz CLI templates are small file templates used by scaffold-style commands.

The current built-in templates live under `templates/` in the Mainz repo:

```txt
templates/
  project/
    empty-deno/
    empty-node/
  app/
    routed/
    root/
  workflow/
    gh-pages/
```

Each template has a `template.json` manifest and a `files/` directory.

```txt
templates/
  app/
    routed/
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
    "name": "empty-deno",
    "runtime": "deno"
}
```

Commands may read extra metadata from the rendered manifest. App templates use this to return the
target entry that `mainz app create` writes into `mainz.config.ts`.

```json
{
    "kind": "app",
    "name": "routed",
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

`mainz init` uses `project` templates to create a runtime-specific empty project.

`mainz app create` uses `app` templates to create app files and then writes the rendered target
metadata into `mainz.config.ts`.

`mainz workflow create gh-pages` and `mainz workflow update gh-pages` use the `workflow/gh-pages`
template to generate the GitHub Actions workflow file.

`mainz profile create` does not use a file template. It creates or updates a profile entry inside
`mainz.config.ts`.

## Adding a Built-In Template

To add a built-in template:

1. create `templates/<kind>/<name>/template.json`
2. put generated files under `templates/<kind>/<name>/files/`
3. use `{{paramName}}` tokens for values supplied by the CLI command
4. use `.tpl` on generated file names when the suffix should be stripped
5. add focused tests for the command or template behavior

The template system is intentionally small. It does not currently include a template DSL,
conditional file inclusion, remote template resolution, or dependency installation from the
manifest.
