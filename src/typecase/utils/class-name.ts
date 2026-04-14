export function joinClassNames(...parts: Array<string | false | null | undefined>): string {
    return parts.filter((part) => typeof part === "string" && part.length > 0).join(" ");
}
