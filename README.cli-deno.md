# Mainz CLI for Deno

Deno-hosted command-line tooling for Mainz.

```powershell
deno install -A -g -f -n mainz jsr:@mainz/cli-deno@0.1.0-alpha.39
```

Create and run a Deno project:

```powershell
mainz init
mainz app create site
mainz dev --target site
```

Create a Node-shaped project from the Deno CLI:

```powershell
mainz init --runtime node
```

Uninstall the global command:

```powershell
deno uninstall -g mainz
```
