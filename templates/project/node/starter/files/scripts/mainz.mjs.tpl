import { main } from "mainz/tooling/cli";

const exitCode = await main(process.argv.slice(2), { hostRuntime: "node" });

process.exit(exitCode);
