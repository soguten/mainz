import {
  createServiceContainer,
  type ServiceContainer,
} from "../di/container.ts";
import {
  type CommandExecutionContext,
  type ListedMainzCommand,
  type MainzCommand,
} from "./command.ts";
import { eventToShortcutChord, normalizeShortcutChord } from "./shortcut.ts";

const MAINZ_APP_ROOT_ATTR = "data-mainz-app-root";
const MAINZ_APP_ID_ATTR = "data-mainz-app-id";

type RegisteredCommand = MainzCommand<never>;

type CommandEntry = {
  appId: string;
  description?: string;
  execute: (context: CommandExecutionContext) => void | boolean;
  id: string;
  registrationSequence: number;
  services: ServiceContainer;
  shortcuts: readonly string[];
  title?: string;
  when?: (context: CommandExecutionContext) => boolean;
};

const APP_REGISTRIES = new WeakMap<HTMLElement, AppCommandRegistry>();
const APP_REGISTRIES_BY_ID = new Map<string, Set<AppCommandRegistry>>();
let generatedAppId = 0;

class AppCommandRegistry {
  private entries = new Map<string, CommandEntry>();
  private keyboardBridge?: (event: KeyboardEvent) => void;
  private registrationSequenceCounter = 0;

  constructor(
    readonly root: HTMLElement,
    private appId: string,
    private services: ServiceContainer = createServiceContainer(),
  ) {}

  update(args: {
    appId?: string;
    commands?: readonly RegisteredCommand[];
    services?: ServiceContainer;
  }): void {
    if (args.appId && args.appId !== this.appId) {
      moveRegistryId(this.appId, this, args.appId);
      this.appId = args.appId;
      this.root.setAttribute(MAINZ_APP_ID_ATTR, args.appId);
    }

    if (args.services !== undefined) {
      this.services = args.services;
    }

    this.syncCommands(args.commands ?? []);
  }

  attachKeyboardBridge(): void {
    if (this.keyboardBridge) {
      return;
    }

    this.keyboardBridge = (event: KeyboardEvent) => {
      const targetRoot = resolveCommandAppRootFromTarget(event.target) ??
        resolveCommandAppRootFromTarget(
          this.root.ownerDocument.activeElement,
        ) ??
        resolveSingleDocumentAppRoot(this.root.ownerDocument);
      if (targetRoot !== this.root) {
        return;
      }

      this.dispatchKeyboardEvent(event);
    };

    this.root.ownerDocument.addEventListener(
      "keydown",
      this.keyboardBridge,
      true,
    );
  }

  cleanup(): void {
    if (this.keyboardBridge) {
      this.root.ownerDocument.removeEventListener(
        "keydown",
        this.keyboardBridge,
        true,
      );
    }

    this.entries.clear();
    unregisterRegistryId(this.appId, this);
    APP_REGISTRIES.delete(this.root);
  }

  run(
    commandId: string,
    context: Omit<CommandExecutionContext, "commandId" | "services">,
  ): boolean {
    const entry = this.entries.get(commandId);
    if (!entry) {
      throw new Error(
        `Mainz command "${commandId}" is not registered in app "${this.appId}".`,
      );
    }

    const executionContext = this.createExecutionContext(entry, context);
    if (!(entry.when?.(executionContext) ?? true)) {
      return false;
    }

    return entry.execute(executionContext) !== false;
  }

  list(): readonly ListedMainzCommand[] {
    return Array.from(this.entries.values())
      .sort((left, right) => {
        if (left.registrationSequence !== right.registrationSequence) {
          return left.registrationSequence - right.registrationSequence;
        }

        return left.id.localeCompare(right.id);
      })
      .map((entry) => ({
        appId: this.appId,
        description: entry.description,
        id: entry.id,
        shortcuts: entry.shortcuts,
        title: entry.title,
      }));
  }

  dispatchKeyboardEvent(event: KeyboardEvent): boolean {
    const chord = eventToShortcutChord(event);
    if (!chord) {
      return false;
    }

    const candidates = Array.from(this.entries.values())
      .filter((entry) => this.matchesAnyShortcut(entry, chord))
      .sort((left, right) =>
        right.registrationSequence - left.registrationSequence
      );

    for (const entry of candidates) {
      const executionContext = this.createExecutionContext(entry, {
        triggerEvent: event,
      });

      if (!(entry.when?.(executionContext) ?? true)) {
        continue;
      }

      const handled = entry.execute(executionContext);
      if (handled === false) {
        continue;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }

    return false;
  }

  private createExecutionContext(
    entry: CommandEntry,
    context: Omit<CommandExecutionContext, "commandId" | "services">,
  ): CommandExecutionContext {
    return {
      commandId: entry.id,
      appId: this.appId,
      services: entry.services,
      ...context,
    };
  }

  private matchesAnyShortcut(
    entry: CommandEntry,
    normalizedEventChord: string,
  ): boolean {
    return entry.shortcuts.some((shortcut) =>
      normalizeShortcutChord(shortcut) === normalizedEventChord
    );
  }

  private syncCommands(commands: readonly RegisteredCommand[]): void {
    const nextEntries = new Map<string, CommandEntry>();

    for (const command of commands) {
      if (nextEntries.has(command.id)) {
        throw new Error(
          `Mainz command id "${command.id}" must be unique within app "${this.appId}".`,
        );
      }

      const existing = this.entries.get(command.id);
      nextEntries.set(command.id, {
        appId: this.appId,
        description: command.description,
        execute: command.execute as (
          context: CommandExecutionContext,
        ) => void | boolean,
        id: command.id,
        registrationSequence: existing?.registrationSequence ??
          ++this.registrationSequenceCounter,
        services: this.services,
        shortcuts: command.shortcuts ?? [],
        title: command.title,
        when: command.when as
          | ((context: CommandExecutionContext) => boolean)
          | undefined,
      });
    }

    this.entries = nextEntries;
  }
}

function registerRegistryId(appId: string, registry: AppCommandRegistry): void {
  const registries = APP_REGISTRIES_BY_ID.get(appId) ??
    new Set<AppCommandRegistry>();
  registries.add(registry);
  APP_REGISTRIES_BY_ID.set(appId, registries);
}

function unregisterRegistryId(
  appId: string,
  registry: AppCommandRegistry,
): void {
  const registries = APP_REGISTRIES_BY_ID.get(appId);
  if (!registries) {
    return;
  }

  registries.delete(registry);
  if (registries.size === 0) {
    APP_REGISTRIES_BY_ID.delete(appId);
  }
}

function moveRegistryId(
  previousAppId: string,
  registry: AppCommandRegistry,
  nextAppId: string,
): void {
  unregisterRegistryId(previousAppId, registry);
  registerRegistryId(nextAppId, registry);
}

function resolveDeclaredAppId(root: HTMLElement): string {
  const declared = root.getAttribute(MAINZ_APP_ID_ATTR)?.trim();
  if (declared) {
    return declared;
  }

  generatedAppId += 1;
  const generated = `mainz-app-${generatedAppId}`;
  root.setAttribute(MAINZ_APP_ID_ATTR, generated);
  return generated;
}

function resolveRegistryByAppId(appId: string): AppCommandRegistry {
  const registries = APP_REGISTRIES_BY_ID.get(appId);
  if (!registries || registries.size === 0) {
    throw new Error(`Mainz command app "${appId}" is not active.`);
  }

  if (registries.size > 1) {
    throw new Error(
      `Mainz command app "${appId}" is ambiguous across active app roots.`,
    );
  }

  return Array.from(registries)[0];
}

function resolveRegistryForExecution(
  context: Omit<CommandExecutionContext, "commandId" | "services">,
): AppCommandRegistry {
  if (context.appId) {
    return resolveRegistryByAppId(context.appId);
  }

  const eventRoot = resolveCommandAppRootFromTarget(
    context.triggerEvent?.target,
  );
  if (eventRoot) {
    return resolveRegistryFromRoot(eventRoot);
  }

  const activeElementRoot = typeof document !== "undefined"
    ? resolveCommandAppRootFromTarget(document.activeElement)
    : undefined;
  if (activeElementRoot) {
    return resolveRegistryFromRoot(activeElementRoot);
  }

  const singleDocumentRoot = typeof document !== "undefined"
    ? resolveSingleDocumentAppRoot(document)
    : undefined;
  if (singleDocumentRoot) {
    return resolveRegistryFromRoot(singleDocumentRoot);
  }

  throw new Error(
    "Mainz command execution could not resolve an active app. Pass appId explicitly when multiple apps are active or execution is detached.",
  );
}

/**
 * Ensures that an app root has an active command registry wired to keyboard handling.
 */
export function ensureAppCommandRegistry(args: {
  root: HTMLElement;
  appId?: string;
  commands?: readonly RegisteredCommand[];
  services?: ServiceContainer;
}): AppCommandRegistry {
  const existing = APP_REGISTRIES.get(args.root);
  if (existing) {
    existing.update({
      appId: args.appId,
      commands: args.commands,
      services: args.services,
    });
    existing.attachKeyboardBridge();
    return existing;
  }

  const appId = args.appId?.trim() || resolveDeclaredAppId(args.root);
  args.root.setAttribute(MAINZ_APP_ROOT_ATTR, "");
  args.root.setAttribute(MAINZ_APP_ID_ATTR, appId);

  const registry = new AppCommandRegistry(args.root, appId, args.services);
  APP_REGISTRIES.set(args.root, registry);
  registerRegistryId(appId, registry);
  registry.update({
    commands: args.commands,
    services: args.services,
  });
  registry.attachKeyboardBridge();
  return registry;
}

/**
 * Removes the command registry attached to an app root.
 */
export function cleanupAppCommandRegistry(root: HTMLElement): void {
  APP_REGISTRIES.get(root)?.cleanup();
}

/**
 * Runs a registered command against the currently resolved app registry.
 */
export function runCommand<TPayload = unknown>(
  commandId: string,
  context: Omit<CommandExecutionContext<TPayload>, "commandId" | "services"> =
    {},
): boolean {
  return resolveRegistryForExecution(
    context as Omit<CommandExecutionContext, "commandId" | "services">,
  ).run(
    commandId,
    context as Omit<CommandExecutionContext, "commandId" | "services">,
  );
}

/**
 * Lists commands for the currently resolved app registry.
 */
export function listCommands(
  context: Omit<CommandExecutionContext, "commandId" | "services"> = {},
): readonly ListedMainzCommand[] {
  return resolveRegistryForExecution(context).list();
}

function resolveRegistryFromRoot(root: HTMLElement): AppCommandRegistry {
  return APP_REGISTRIES.get(root) ?? ensureAppCommandRegistry({ root });
}

function resolveCommandAppRootFromTarget(
  target: EventTarget | null | undefined,
): HTMLElement | undefined {
  if (!(target instanceof Node)) {
    return undefined;
  }

  const element = target instanceof Element ? target : target.parentElement;
  const root = element?.closest<HTMLElement>(`[${MAINZ_APP_ROOT_ATTR}]`);
  return root ?? undefined;
}

function resolveSingleDocumentAppRoot(
  ownerDocument: Document,
): HTMLElement | undefined {
  const roots = Array.from(
    ownerDocument.querySelectorAll<HTMLElement>(`[${MAINZ_APP_ROOT_ATTR}]`),
  );
  return roots.length === 1 ? roots[0] : undefined;
}
