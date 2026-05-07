export const invalidLocalePageDiscoveryErrorKind = "invalid-locale" as const;
export const pageDiscoveryFailedErrorKind = "discovery-failed" as const;

export type PageDiscoveryErrorKind =
  | typeof invalidLocalePageDiscoveryErrorKind
  | typeof pageDiscoveryFailedErrorKind;

export interface PageDiscoveryError {
  kind: PageDiscoveryErrorKind;
  file: string;
  message: string;
}
