export type ShortcutChord = string;
export type ShortcutPlatform = "auto" | "apple" | "standard";

export interface ShortcutOptions {
  platform?: ShortcutPlatform;
}

export interface ShortcutDisplayPart {
  ariaLabel?: string;
  label: string;
  symbol?: boolean;
  value: string;
}

type ResolvedShortcutPlatform = Exclude<ShortcutPlatform, "auto">;

const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"] as const;

const EVENT_CODE_KEY_NAMES: Readonly<Record<string, string>> = {
  Backquote: "Backquote",
  Backslash: "Backslash",
  BracketLeft: "BracketLeft",
  BracketRight: "BracketRight",
  Equal: "Equal",
  Minus: "Minus",
  Quote: "Quote",
  Semicolon: "Semicolon",
  Slash: "Slash",
};

const TOKEN_ALIASES: Readonly<Record<string, string>> = {
  alt: "Alt",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  arrowup: "ArrowUp",
  backquote: "Backquote",
  backslash: "Backslash",
  backspace: "Backspace",
  bracketleft: "BracketLeft",
  bracketright: "BracketRight",
  cmd: "Meta",
  cmdorctrl: "Mod",
  command: "Meta",
  control: "Ctrl",
  ctrl: "Ctrl",
  del: "Delete",
  delete: "Delete",
  down: "ArrowDown",
  enter: "Enter",
  eq: "Equal",
  equal: "Equal",
  esc: "Escape",
  escape: "Escape",
  left: "ArrowLeft",
  meta: "Meta",
  minus: "Minus",
  mod: "Mod",
  option: "Alt",
  quote: "Quote",
  return: "Enter",
  right: "ArrowRight",
  semicolon: "Semicolon",
  shift: "Shift",
  slash: "Slash",
  space: "Space",
  spacebar: "Space",
  super: "Meta",
  tab: "Tab",
  up: "ArrowUp",
  win: "Meta",
  windows: "Meta",
  "?": "Slash",
  "/": "Slash",
  "`": "Backquote",
  "[": "BracketLeft",
  "\\": "Backslash",
  "]": "BracketRight",
  "-": "Minus",
  "=": "Equal",
  ";": "Semicolon",
  "'": "Quote",
};

function resolveShortcutPlatform(
  platform: ShortcutPlatform = "auto",
): ResolvedShortcutPlatform {
  return platform === "auto" ? detectShortcutPlatform() : platform;
}

function isApplePlatformValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /mac|iphone|ipad|ipod|ios/i.test(value);
}

function readNavigatorString(
  getValue: () => string | undefined,
): string | undefined {
  try {
    return getValue();
  } catch {
    return undefined;
  }
}

function normalizeModifierToken(
  part: string,
  platform: ResolvedShortcutPlatform,
): string | null {
  const normalized = TOKEN_ALIASES[part.trim().toLocaleLowerCase()] ??
    part.trim();

  switch (normalized) {
    case "Mod":
      return platform === "apple" ? "Meta" : "Ctrl";
    case "Ctrl":
    case "Alt":
    case "Shift":
    case "Meta":
      return normalized;
    default:
      return null;
  }
}

function normalizeKeyToken(part: string): string {
  const trimmed = part.trim();
  const alias = TOKEN_ALIASES[trimmed.toLocaleLowerCase()] ?? trimmed;

  if (/^[a-z]$/i.test(alias)) {
    return alias.toUpperCase();
  }

  if (/^\d$/.test(alias)) {
    return alias;
  }

  return alias;
}

function eventKeyToShortcutPart(event: KeyboardEvent): string {
  const alias = TOKEN_ALIASES[event.key.toLocaleLowerCase()] ?? event.key;

  if (/^[a-z]$/i.test(alias)) {
    return alias.toUpperCase();
  }

  if (alias === " " || alias === "Spacebar") {
    return "Space";
  }

  if (EVENT_CODE_KEY_NAMES[event.code]) {
    return EVENT_CODE_KEY_NAMES[event.code];
  }

  if (/^\d$/.test(alias)) {
    return alias;
  }

  return alias;
}

function getShortcutDisplayPart(
  value: string,
  platform: ResolvedShortcutPlatform,
): ShortcutDisplayPart {
  if (platform === "apple") {
    switch (value) {
      case "Ctrl":
        return { ariaLabel: "Control", label: "⌃", symbol: true, value };
      case "Alt":
        return { ariaLabel: "Option", label: "⌥", symbol: true, value };
      case "Shift":
        return { ariaLabel: "Shift", label: "⇧", symbol: true, value };
      case "Meta":
        return { ariaLabel: "Command", label: "⌘", symbol: true, value };
    }
  }

  switch (value) {
    case "Ctrl":
      return { ariaLabel: "Control", label: "Ctrl", value };
    case "Alt":
      return { ariaLabel: "Alt", label: "Alt", value };
    case "Shift":
      return { ariaLabel: "Shift", label: "Shift", value };
    case "Meta":
      return { ariaLabel: "Meta", label: "Meta", value };
    case "ArrowUp":
      return { ariaLabel: "Arrow Up", label: "Up", value };
    case "ArrowDown":
      return { ariaLabel: "Arrow Down", label: "Down", value };
    case "ArrowLeft":
      return { ariaLabel: "Arrow Left", label: "Left", value };
    case "ArrowRight":
      return { ariaLabel: "Arrow Right", label: "Right", value };
    case "Backquote":
      return { label: "`", value };
    case "Backslash":
      return { label: "\\", value };
    case "BracketLeft":
      return { label: "[", value };
    case "BracketRight":
      return { label: "]", value };
    case "Delete":
      return { label: "Del", value };
    case "Enter":
      return { label: "Enter", value };
    case "Equal":
      return { label: "=", value };
    case "Escape":
      return { label: "Esc", value };
    case "Minus":
      return { label: "-", value };
    case "Quote":
      return { label: "'", value };
    case "Semicolon":
      return { label: ";", value };
    case "Slash":
      return { label: "/", value };
    case "Space":
      return { label: "Space", value };
    case "Tab":
      return { label: "Tab", value };
    default:
      return { label: value, value };
  }
}

export function detectShortcutPlatform(): ResolvedShortcutPlatform {
  if (typeof navigator === "undefined") {
    return "standard";
  }

  const userAgentData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const userAgentDataPlatform = readNavigatorString(() =>
    userAgentData.userAgentData?.platform
  );
  const navigatorPlatform = readNavigatorString(() => navigator.platform);
  const navigatorUserAgent = readNavigatorString(() => navigator.userAgent);

  if (isApplePlatformValue(userAgentDataPlatform)) {
    return "apple";
  }

  if (isApplePlatformValue(navigatorPlatform)) {
    return "apple";
  }

  if (navigatorUserAgent && /iphone|ipad|ipod/i.test(navigatorUserAgent)) {
    return "apple";
  }

  return "standard";
}

export function normalizeShortcutChord(
  chord: ShortcutChord,
  options: ShortcutOptions = {},
): string {
  const platform = resolveShortcutPlatform(options.platform);
  const parts = chord.split("+").map((part) => part.trim()).filter(Boolean);
  const modifiers = new Set<string>();
  let key = "";

  for (const part of parts) {
    const modifier = normalizeModifierToken(part, platform);

    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    key = normalizeKeyToken(part);
  }

  return [
    ...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)),
    ...(key ? [key] : []),
  ].join("+");
}

export function formatShortcutChord(
  chord: ShortcutChord,
  options: ShortcutOptions = {},
): readonly ShortcutDisplayPart[] {
  const platform = resolveShortcutPlatform(options.platform);
  const normalized = normalizeShortcutChord(chord, { platform });

  if (!normalized) {
    return [];
  }

  return normalized
    .split("+")
    .filter(Boolean)
    .map((part) => getShortcutDisplayPart(part, platform));
}

export function eventToShortcutChord(event: KeyboardEvent): string {
  const key = eventKeyToShortcutPart(event);
  const isSlashKey = key === "Slash";
  const parts: string[] = [];

  if (event.ctrlKey) {
    parts.push("Ctrl");
  }

  if (event.altKey) {
    parts.push("Alt");
  }

  if (event.shiftKey && !isSlashKey) {
    parts.push("Shift");
  }

  if (event.metaKey) {
    parts.push("Meta");
  }

  if (!MODIFIER_ORDER.includes(key as typeof MODIFIER_ORDER[number])) {
    parts.push(key);
  }

  return parts.join("+");
}

export function matchesShortcut(
  event: KeyboardEvent,
  chord: ShortcutChord,
  options: ShortcutOptions = {},
): boolean {
  if (!chord.trim()) {
    return false;
  }

  return eventToShortcutChord(event) === normalizeShortcutChord(chord, options);
}
