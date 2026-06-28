# {{projectName}}

## Commands

Install dependencies:

```bash
deno install
```

Create the first app target:

```bash
deno task mainz app create my-app
```

Start the dev server for a target:

```bash
deno task dev --target my-app
```

Build a target:

```bash
deno task build --target my-app
```

Preview a built target:

```bash
deno task preview --target my-app
```

Run diagnostics for a target:

```bash
deno task diagnose --target my-app
```

Target names come from `mainz.config.ts`. Replace `my-app` with the target you create.
