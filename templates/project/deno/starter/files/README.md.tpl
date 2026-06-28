# {{projectName}}

## Commands

Install dependencies:

```bash
deno install
```

Start the starter app:

```bash
deno task dev --target app
```

Build the starter app:

```bash
deno task build --target app
```

Preview the built starter app:

```bash
deno task preview --target app
```

Run diagnostics for the starter app:

```bash
deno task diagnose --target app
```

Create another app target:

```bash
deno task mainz app create my-app
```

Then run it with:

```bash
deno task dev --target my-app
```
