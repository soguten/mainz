/**
 * Default type for component properties.
 * Represents a flexible props object that may include children.
 *
 * Use `NoProps` when a component should not accept any props.
 * Use `ChildrenOnlyProps` when a component should accept only JSX children.
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
 */
export type DefaultState = Record<string, unknown>;

/** Props shape for a component that should not accept any props, including children. */
export type NoProps = Record<string, never>;

/** State shape for a component that does not use local state. */
export type NoState = Record<string, never>;

/** Props shape for a component that accepts only JSX children. */
export interface ChildrenOnlyProps {
    children?: unknown;
}
