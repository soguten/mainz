import { resolve } from "node:path";

export const mainzTempDirName = ".mainz_temp";

export function resolveMainzTempRoot(cwd: string): string {
    return resolve(cwd, mainzTempDirName);
}

export function resolveMainzTempPath(cwd: string, ...segments: string[]): string {
    return resolve(resolveMainzTempRoot(cwd), ...segments);
}
