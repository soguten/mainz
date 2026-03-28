export type BackendMode = "http" | "mock";

const BACKEND_STORAGE_KEY = "mainz.di-http-site.backend";

export function readBackendMode(): BackendMode {
    if (typeof localStorage === "undefined") {
        return "http";
    }

    const value = localStorage.getItem(BACKEND_STORAGE_KEY);
    return value === "mock" ? "mock" : "http";
}

export function setBackendMode(mode: BackendMode): void {
    if (typeof localStorage === "undefined") {
        return;
    }

    localStorage.setItem(BACKEND_STORAGE_KEY, mode);
}

export function switchBackendMode(mode: BackendMode): void {
    setBackendMode(mode);

    if (typeof window !== "undefined") {
        window.location.reload();
    }
}

export function describeBackendMode(mode: BackendMode): string {
    return mode === "mock" ? "Mock replacement" : "HttpClient transport";
}
