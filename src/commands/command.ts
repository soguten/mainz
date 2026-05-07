import type { ServiceContainer } from "../di/container.ts";

/**
 * Runtime context passed to Mainz commands when they execute.
 */
export interface CommandExecutionContext<TPayload = unknown> {
  /** Registered command identifier. */
  commandId: string;
  /** Active app id when command resolution is scoped to a specific app. */
  appId?: string;
  /** Event that triggered the command, when available. */
  triggerEvent?: Event;
  /** Optional payload supplied by the caller. */
  payload?: TPayload;
  /** Service container attached to the active app. */
  services: ServiceContainer;
}

/**
 * Declarative command definition for a Mainz app.
 */
export interface MainzCommand<TPayload = unknown> {
  /** Stable command identifier unique within an app. */
  id: string;
  /** Human-readable title shown in listings and command UIs. */
  title?: string;
  /** Longer description shown in command listings. */
  description?: string;
  /** Shortcut chords that trigger the command. */
  shortcuts?: readonly string[];
  /** Optional predicate that decides if the command is currently enabled. */
  when?: (context: CommandExecutionContext<TPayload>) => boolean;
  /** Command implementation. Returning `false` indicates the command was not handled. */
  execute: (context: CommandExecutionContext<TPayload>) => void | boolean;
}

/**
 * Serializable metadata returned by command listings.
 */
export interface ListedMainzCommand {
  /** App that owns the command registration. */
  appId: string;
  /** Optional command description. */
  description?: string;
  /** Stable command identifier. */
  id: string;
  /** Registered shortcuts for the command. */
  shortcuts: readonly string[];
  /** Optional command title. */
  title?: string;
}

/**
 * Identity helper for defining strongly typed Mainz commands.
 */
export function defineCommand<
  TPayload = unknown,
  TCommand extends MainzCommand<TPayload> = MainzCommand<TPayload>,
>(
  command: TCommand,
): TCommand {
  return command;
}
