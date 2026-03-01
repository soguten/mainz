/**
 * Default type for component properties.
 * Represents a generic object with children.
 * 
 * @typedef {Record<string, unknown>} DefaultProps
 */
export interface DefaultProps {
  // deno-lint-ignore no-explicit-any
  children?: any;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/**
 * Default type for component state.
 * Represents a generic object with string keys and unknown values.
 * 
 * @typedef {Record<string, unknown>} DefaultState
 */
export type DefaultState = Record<string, unknown>;