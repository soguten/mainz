## Install the toolchain

Mainz leans on Deno and Vite, so the setup is intentionally small.

If your repo already uses Deno tasks, Mainz fits in cleanly without an extra package manager layer.

```bash title="Install and run"
deno task build:site:ssg:enhanced-mpa
deno task preview:site:ssg:enhanced-mpa
```

## Add a target

Targets are how Mainz understands that a repo can host multiple apps.

That means a docs app, a playground, and a marketing site can all share one framework workspace without pretending to be the same product.
