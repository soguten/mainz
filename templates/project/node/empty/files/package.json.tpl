{
  "name": "{{projectName}}",
  "private": true,
  "type": "module",
  "scripts": {
    "mainz": "node ./scripts/mainz.mjs",
    "dev": "npm run mainz -- dev",
    "build": "npm run mainz -- build",
    "preview": "npm run mainz -- preview",
    "test": "npm run mainz -- test",
    "diagnose": "npm run mainz -- diagnose"
  },
  "dependencies": {
    "mainz": "{{mainzSpecifier}}"
  },
  "devDependencies": {
    "vite": "^8.0.10"
  }
}
