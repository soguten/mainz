/** Declared JSX properties, distinct from the browser's live control state. */
export interface FormControlProps {
  value?: unknown;
  checked?: unknown;
  selected?: unknown;
  defaultValue?: unknown;
  defaultChecked?: unknown;
  defaultSelected?: unknown;
}

const declaredProps = new WeakMap<Element, FormControlProps>();

export function recordFormControlProps(
  element: Element,
  props: Record<string, unknown> | null,
): void {
  const declared: FormControlProps = {};
  for (
    const key of [
      "value",
      "checked",
      "selected",
      "defaultValue",
      "defaultChecked",
      "defaultSelected",
    ] as const
  ) {
    if (props && Object.hasOwn(props, key)) declared[key] = props[key];
  }
  declaredProps.set(element, declared);
}

/** Undefined identifies manually constructed DOM, which retains legacy syncing. */
export function getFormControlProps(
  element: Element,
): FormControlProps | undefined {
  return declaredProps.get(element);
}

/** These properties must be initialized after type/multiple and children. */
export function isFormControlProperty(element: Element, key: string): boolean {
  if (element.namespaceURI !== "http://www.w3.org/1999/xhtml") return false;
  switch (element.localName) {
    case "input":
      return ["value", "defaultValue", "checked", "defaultChecked"].includes(
        key,
      );
    case "textarea":
    case "select":
      return key === "value" || key === "defaultValue";
    case "option":
      return key === "selected" || key === "defaultSelected";
    default:
      return false;
  }
}

export function initializeFormControl(element: Element): void {
  const win = element.ownerDocument.defaultView;
  const props = getFormControlProps(element);
  if (!win || !props) return;
  const has = (key: keyof FormControlProps) => Object.hasOwn(props, key);
  if (
    element instanceof win.HTMLInputElement ||
    element instanceof win.HTMLTextAreaElement
  ) {
    const isFile = element instanceof win.HTMLInputElement &&
      element.type === "file";
    if (!isFile && (has("defaultValue") || has("value"))) {
      const value = has("defaultValue") ? props.defaultValue : props.value;
      element.defaultValue = value == null ? "" : String(value);
    }
    if (has("value")) {
      element.value = props.value == null ? "" : String(props.value);
    }
    if (element instanceof win.HTMLInputElement) {
      if (has("defaultChecked") || has("checked")) {
        element.defaultChecked = Boolean(
          has("defaultChecked") ? props.defaultChecked : props.checked,
        );
      }
      if (has("checked")) element.checked = Boolean(props.checked);
    }
  } else if (element instanceof win.HTMLOptionElement) {
    if (has("defaultSelected") || has("selected")) {
      element.toggleAttribute(
        "selected",
        Boolean(
          has("defaultSelected") ? props.defaultSelected : props.selected,
        ),
      );
    }
    if (has("selected")) element.selected = Boolean(props.selected);
  } else if (element instanceof win.HTMLSelectElement) {
    if (has("defaultValue") || has("value")) {
      setSelectValue(
        element,
        has("defaultValue") ? props.defaultValue : props.value,
        true,
      );
    }
    if (has("value")) setSelectValue(element, props.value);
  }
}

/** A multiple select's .value only represents its first selected option. */
export function setSelectValue(
  element: HTMLSelectElement,
  value: unknown,
  defaults = false,
): void {
  const values = new Set(
    (Array.isArray(value) ? value : [value == null ? "" : value]).map(String),
  );
  let matched = false;
  for (const option of Array.from(element.options)) {
    const selected = values.has(option.value) && (element.multiple || !matched);
    if (selected) matched = true;
    if (defaults) option.toggleAttribute("selected", selected);
    if (option.selected !== selected) option.selected = selected;
  }
  // Single selects can auto-select the first option as other options change.
  if (
    !element.multiple
  ) {
    const normalized = value == null ? "" : String(value);
    if (element.value !== normalized || !matched) element.value = normalized;
  }
}
