import type { ServiceContainer } from "../di/container.ts";

export interface CommandExecutionContext<TPayload = unknown> {
    commandId: string;
    appId?: string;
    triggerEvent?: Event;
    payload?: TPayload;
    services: ServiceContainer;
}

export interface MainzCommand<TPayload = unknown> {
    id: string;
    title?: string;
    description?: string;
    shortcuts?: readonly string[];
    when?: (context: CommandExecutionContext<TPayload>) => boolean;
    execute: (context: CommandExecutionContext<TPayload>) => void | boolean;
}

export interface ListedMainzCommand {
    appId: string;
    description?: string;
    id: string;
    shortcuts: readonly string[];
    title?: string;
}

export function defineCommand<TPayload = unknown, TCommand extends MainzCommand<TPayload> = MainzCommand<TPayload>>(
    command: TCommand,
): TCommand {
    return command;
}
