function renderGeneratedMainzCliSpecifier(mainzSpecifier: string): string {
    const trimmed = mainzSpecifier.trim().replace(/\/+$/, "");
    const jsrMainzMatch = trimmed.match(/^jsr:@mainz\/mainz(@.+)?$/);
    if (jsrMainzMatch) {
        return `jsr:@mainz/cli-deno${jsrMainzMatch[1] ?? ""}`;
    }

    return trimmed;
}

function renderGeneratedMainzSubpathPrefix(mainzSpecifier: string): string {
    const trimmed = mainzSpecifier.trim().replace(/\/+$/, "");
    if (trimmed.startsWith("jsr:@")) {
        return `jsr:/${trimmed.slice("jsr:".length)}/`;
    }

    return `${trimmed}/`;
}

function quoteCommandArgument(value: string): string {
    if (/^[A-Za-z0-9._/@:-]+$/.test(value)) {
        return value;
    }

    return `"${value.replaceAll('"', '\\"')}"`;
}

/**
 * Renders the Deno-specific configuration for an empty Mainz project.
 */
export function renderEmptyDenoProjectConfig(
    mainzSpecifier: string,
    denoConfigPath: string,
): string {
    const cliSpecifier = renderGeneratedMainzCliSpecifier(mainzSpecifier);
    const cliCommand = `deno run -A --config ${
        quoteCommandArgument(denoConfigPath)
    } ${cliSpecifier}`;

    return `${
        JSON.stringify(
            {
                compilerOptions: {
                    lib: ["dom", "esnext"],
                    jsx: "react-jsx",
                    jsxImportSource: "mainz",
                    strict: true,
                },
                imports: {
                    "@deno/vite-plugin": "npm:@deno/vite-plugin@2.0.2",
                    mainz: mainzSpecifier,
                    "mainz/": renderGeneratedMainzSubpathPrefix(mainzSpecifier),
                    vite: "npm:vite@7.3.1",
                },
                tasks: {
                    dev: `${cliCommand} dev`,
                    build: `${cliCommand} build`,
                    preview: `${cliCommand} preview`,
                    test: `${cliCommand} test`,
                    diagnose: `${cliCommand} diagnose`,
                },
            },
            null,
            4,
        )
    }\n`;
}
