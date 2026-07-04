{
  "compilerOptions": {
    "lib": ["dom", "esnext"],
    "jsx": "react-jsx",
    "jsxImportSource": "mainz",
    "strict": true
  },
  "imports": {
    "@deno/vite-plugin": "npm:@deno/vite-plugin@2.0.2",
    "mainz": "{{mainzSpecifier}}",
    "mainz/": "{{mainzSubpathPrefix}}",
    "typescript": "npm:typescript@5.9.3",
    "vite": "npm:vite@8.0.10"
  },
  "tasks": {
    "mainz": "deno run -A --config {{denoConfigPath}} {{mainzToolingCliSpecifier}}",
    "dev": "deno task mainz dev",
    "build": "deno task mainz build",
    "preview": "deno task mainz preview",
    "diagnose": "deno task mainz diagnose"
  }
}
