export type MarkdownBlock =
    | { type: "heading"; level: 2 | 3; text: string; id: string }
    | { type: "paragraph"; text: string }
    | { type: "blockquote"; text: string }
    | { type: "code"; language: string; label?: string; content: string };

export function parseMarkdown(markdown: string): readonly MarkdownBlock[] {
    const lines = markdown.replace(/\r\n/g, "\n").trim().split("\n");
    const blocks: MarkdownBlock[] = [];

    let index = 0;

    while (index < lines.length) {
        const rawLine = lines[index];
        const line = rawLine.trim();

        if (!line) {
            index += 1;
            continue;
        }

        if (line.startsWith("```")) {
            const fence = line.slice(3).trim();
            const language = fence.split(/\s+/)[0] ?? "plaintext";
            const labelMatch = fence.match(/title="([^"]+)"/);
            const contentLines: string[] = [];
            index += 1;

            while (index < lines.length && !lines[index].trim().startsWith("```")) {
                contentLines.push(lines[index]);
                index += 1;
            }

            blocks.push({
                type: "code",
                language,
                label: labelMatch?.[1],
                content: contentLines.join("\n"),
            });

            index += 1;
            continue;
        }

        if (line.startsWith("## ")) {
            const text = line.slice(3).trim();
            blocks.push({
                type: "heading",
                level: 2,
                text,
                id: slugifyHeading(text),
            });
            index += 1;
            continue;
        }

        if (line.startsWith("### ")) {
            const text = line.slice(4).trim();
            blocks.push({
                type: "heading",
                level: 3,
                text,
                id: slugifyHeading(text),
            });
            index += 1;
            continue;
        }

        if (line.startsWith("> ")) {
            const noteLines = [line.slice(2).trim()];
            index += 1;

            while (index < lines.length && lines[index].trim().startsWith("> ")) {
                noteLines.push(lines[index].trim().slice(2).trim());
                index += 1;
            }

            blocks.push({
                type: "blockquote",
                text: noteLines.join(" "),
            });
            continue;
        }

        const paragraphLines = [line];
        index += 1;

        while (
            index < lines.length &&
            lines[index].trim() &&
            !lines[index].trim().startsWith("## ") &&
            !lines[index].trim().startsWith("### ") &&
            !lines[index].trim().startsWith("> ") &&
            !lines[index].trim().startsWith("```")
        ) {
            paragraphLines.push(lines[index].trim());
            index += 1;
        }

        blocks.push({
            type: "paragraph",
            text: paragraphLines.join(" "),
        });
    }

    return blocks;
}

export function slugifyHeading(value: string): string {
    return value
        .toLowerCase()
        .replace(/`/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
