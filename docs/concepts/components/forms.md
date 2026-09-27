---
title: Native forms
summary: Use native controls with controlled values, defaults, validation and FormData.
---

Mainz uses native HTML controls and events. An uncontrolled field keeps its live
value across unrelated component renders. Give it a `name` to include it in
`new FormData(form)`.

```tsx
<form
  onSubmit={(event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    // Send data through your application service.
  }}
>
  <input name="title" defaultValue="Draft" required />
  <textarea name="description" defaultValue="Description" />
  <input name="published" type="checkbox" value="yes" defaultChecked />
  <button type="submit">Save</button>
  <button type="reset">Reset</button>
</form>;
```

## Controlled values and defaults

| JSX property      | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| `value`           | Controls the current input, textarea or select value on render |
| `checked`         | Controls the current checkbox/radio state on render            |
| `selected`        | Controls an option's current selection on render               |
| `defaultValue`    | Initial/reset value for input, textarea or select              |
| `defaultChecked`  | Initial/reset checked state for checkbox/radio                 |
| `defaultSelected` | Initial/reset selection for an option                          |

Explicit controlled values take precedence over defaults for the live control,
independently of JSX property order. When no explicit default is provided, a
controlled value also supplies the rendered HTML/reset baseline. File inputs
remain browser-owned; omit value/defaultValue for uploads.

To release control, omit the property. Explicit `value={undefined}` or
`value={null}` means an empty controlled value; explicit undefined/null checked
or selected means false. A checkbox's submission `value` is independent of
whether its `checked` state is controlled.

`form.reset()` performs a native reset to the rendered defaults; it does not
change component state. The next component render reapplies controlled values.
If resetting must change application state too, handle the reset in your
component and update that state explicitly.

## Multiple selects

Use an array for a controlled multiple select, or `defaultValue` for an
uncontrolled initial selection. An empty controlled array clears all selections.

```tsx
<select name="tags" multiple defaultValue={["typescript", "web"]}>
  <option value="typescript">TypeScript</option>
  <option value="web">Web</option>
  <option value="testing">Testing</option>
</select>;
```

Read all selections with `new FormData(form).getAll("tags")` or
`select.selectedOptions`. `select.value` only represents the first selected
option. [MDN select reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement).

## Validation and submission

Native `required`, `pattern`, range constraints, `checkValidity()`,
`reportValidity()` and `setCustomValidity()` remain available. Use
`requestSubmit()` when programmatic submission should perform validation and
dispatch submit. The application owns pending state, duplicate-request
prevention and server validation errors.

For multiple submit buttons, use the native `SubmitEvent.submitter` to identify
which action was chosen. Include that button in submitted data with
`new FormData(form, event.submitter)` when the submitter is a button or submit
input. A button with `formNoValidate` bypasses constraint validation; disabled
fields and unchecked checkboxes are excluded from FormData.

HTML boolean attributes such as `required={false}` are omitted. ARIA and
enumerated attributes retain their string values, including `"false"`.

## Verification limits

The component suite uses Happy DOM. Dedicated Chromium, Firefox and WebKit tests
cover interactions that cannot be established reliably there, including
multiple-value FormData and multiple-select reset. The browser harness bundles
the Component/JSX core; it does not replace full application build/hydration
tests. IME, autofill and preservation of edits across hydration are still
release gates.
