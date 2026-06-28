type DynamicImportFunction = <T = unknown>(specifier: string) => Promise<T>;

const dynamicImportFunction = new Function(
  "specifier",
  "return import(specifier);",
) as DynamicImportFunction;

export function dynamicImport<T = unknown>(specifier: string): Promise<T> {
  return dynamicImportFunction<T>(specifier);
}
