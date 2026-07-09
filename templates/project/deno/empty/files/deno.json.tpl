{
  "compilerOptions": {
    "lib": ["dom", "esnext"],
    "jsx": "react-jsx",
    "jsxImportSource": "mainz",
    "strict": true
  },
  "imports": {
    "mainz": "{{mainzSpecifier}}",
    "mainz/": "{{mainzSubpathPrefix}}"
  },
  "tasks": {
    "mainz": "deno run -A --config {{denoConfigPath}} {{mainzToolingCliSpecifier}}",
    "dev": "deno task mainz dev",
    "build": "deno task mainz build",
    "preview": "deno task mainz preview",
    "diagnose": "deno task mainz diagnose"
  }
}
