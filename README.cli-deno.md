# Mainz CLI for Deno

Deno-hosted command-line tooling for Mainz.

```powershell
deno install -A -g -f -n mainz jsr:@mainz/cli-deno@0.1.0-alpha.39
```

`mainz` is the ergonomic command. Other Mainz CLIs can still delegate to the
Deno CLI through `deno run -A jsr:@mainz/cli-deno@alpha ...`, so a second global
command is not required.

Create and run a Deno project:

```powershell
mainz init
mainz app create site
mainz dev --target site
```

Create a runnable starter project in a new directory:

```powershell
mainz init my-app --template starter
mainz dev --target app
```

`--template` accepts built-in names or template sources such as local paths,
absolute paths, `file://` URLs, and HTTP template sources.

Some app templates can declare runtime compatibility and dependencies. For
example, `mainz app create my-chart --template chart` creates a routed chart app
and adds chart.js to the project manifest for the current runtime.

Create a Node-shaped project from the Deno CLI:

```powershell
mainz init --runtime node
```

Uninstall the global command:

```powershell
deno uninstall -g mainz
```
