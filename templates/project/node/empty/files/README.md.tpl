# {{projectName}}

## Commands

Install dependencies:

```bash
npm install
```

Create the first app target:

```bash
npm run mainz -- app create my-app
```

Start the dev server for a target:

```bash
npm run dev -- --target my-app
```

Build a target:

```bash
npm run build -- --target my-app
```

Preview a built target:

```bash
npm run preview -- --target my-app
```

Run diagnostics for a target:

```bash
npm run diagnose -- --target my-app
```

Target names come from `mainz.config.ts`. Replace `my-app` with the target you create.
