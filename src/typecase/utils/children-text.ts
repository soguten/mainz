export function childrenToText(value: unknown): string {
    if (value == null || typeof value === "boolean") {
        return "";
    }

    if (Array.isArray(value)) {
        return value.map((entry) => childrenToText(entry)).join("");
    }

    return String(value);
}
