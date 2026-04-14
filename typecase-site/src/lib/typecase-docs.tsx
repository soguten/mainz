import {
    Accordion,
    Alert,
    Anchor,
    Avatar,
    Badge,
    Breadcrumb,
    Button,
    Callout,
    Card,
    Center,
    Checkbox,
    CheckIcon,
    Cluster,
    CodeBlock,
    Container,
    CopyIcon,
    darkTheme,
    DescriptionList,
    Dialog,
    Divider,
    Drawer,
    Dropdown,
    DropdownMenu,
    EmptyState,
    Field,
    Fieldset,
    Figure,
    Grid,
    Heading3Icon,
    Image,
    Inline,
    Input,
    Inset,
    Kbd,
    Label,
    LinkBox,
    List,
    MetaTable,
    Modal,
    Navbar,
    Offcanvas,
    OnThisPage,
    Pagination,
    Popover,
    PopoverTrigger,
    Progress,
    Radio,
    Screen,
    ScrollArea,
    SearchIcon,
    Section,
    Select,
    Shortcut,
    Show,
    Skeleton,
    Snippet,
    Spacer,
    Spinner,
    Split,
    Stack,
    Stat,
    StatusDot,
    Steps,
    Surface,
    Switch,
    Table,
    Tabs,
    Text,
    Textarea,
    ThemeSwitch,
    Title,
    Toast,
    Tooltip,
    Topbar,
    TypecaseRoot,
} from "mainz/typecase";
import { TypecaseDocsSnippet } from "../components/TypecaseDocsSnippet.tsx";
import { draculaTheme } from "./dracula-theme.ts";
import { editorialTheme, editorialThemeVars } from "./editorial-theme.ts";

export type TypecaseDocSectionId =
    | "foundations"
    | "primitives"
    | "layout"
    | "composites"
    | "patterns";

export interface TypecaseDocEntry {
    slug: string;
    title: string;
    summary: string;
    sectionId: TypecaseDocSectionId;
    order: number;
    usage: string;
    notes: readonly string[];
    renderPreview: () => unknown;
}

export interface TypecaseDocNavSection {
    id: TypecaseDocSectionId;
    title: string;
    items: readonly {
        slug: string;
        title: string;
    }[];
}

const sectionMeta: Readonly<Record<TypecaseDocSectionId, { order: number; title: string }>> = {
    foundations: { order: 1, title: "Foundations" },
    primitives: { order: 2, title: "Primitives" },
    layout: { order: 3, title: "Layout" },
    composites: { order: 4, title: "Composites" },
    patterns: { order: 5, title: "Patterns" },
};

const docs: readonly TypecaseDocEntry[] = [
    {
        slug: "typecase-root",
        title: "TypecaseRoot",
        summary:
            "Activates the base styles and resolves a concrete theme for the subtree, including optional light, dark, and auto preference handling.",
        sectionId: "foundations",
        order: 1,
        usage: `<TypecaseRoot
  themes={[editorialTheme, darkTheme]}
  defaultPreference="auto"
  storageKey="docs:theme"
>
  <Button>Scoped theme</Button>
</TypecaseRoot>`,
        notes: [
            "Use it once around a page or a documentation surface.",
            "Pass `themes` when the host wants to map light and dark schemes to concrete Typecase themes.",
            "Replacing the default light theme is just a matter of supplying your own light-scheme theme in `themes`, for example `themes={[editorialTheme, darkTheme]}`.",
            "To extend a built-in theme, start from `editorialTheme.vars` or `editorialThemeVars` and override only the tokens you want to change.",
            "Use `preference`, `defaultPreference`, and `storageKey` to control or persist user theme choices.",
        ],
        renderPreview: () => (
            <Stack gap="lg">
                <Text tone="muted">
                    The root can resolve a concrete theme from available schemes and a user
                    preference.
                </Text>
                <TypecaseRoot
                    defaultPreference="dark"
                    storageKey={false}
                    themes={[editorialTheme, darkTheme]}
                >
                    <Inline gap="md" justify="space-between">
                        <Title as="h3" size="md">Resolved scope</Title>
                        <ThemeSwitch />
                    </Inline>
                </TypecaseRoot>

                <TypecaseDocsSnippet
                    code={`import {
  darkTheme,
  editorialTheme,
  editorialThemeVars,
  TypecaseRoot,
  type TypecaseTheme,
} from "mainz/typecase";

const brandLightTheme: TypecaseTheme = {
  name: "brand-light",
  scheme: "light",
  vars: {
    ...editorialThemeVars,
    "--tc-color-link": "#0f766e",
    "--tc-button-primary-bg": "#0f766e",
    "--tc-button-primary-bg-hover": "#115e59",
  },
};

<TypecaseRoot
  themes={[brandLightTheme, darkTheme]}
  defaultPreference="auto"
  storageKey="docs:theme"
>
  ...
</TypecaseRoot>`}
                    language="tsx"
                />
            </Stack>
        ),
    },
    {
        slug: "icons",
        title: "Icons",
        summary:
            "Small SVG icon components with shared props so icons can live in the same public surface as the rest of Typecase.",
        sectionId: "foundations",
        order: 2,
        usage: `import { CopyIcon, Heading3Icon } from "mainz/typecase";

<Inline gap="md">
  <CopyIcon size={16} />
  <Heading3Icon size={20} />
</Inline>`,
        notes: [
            "Prefer named icon components over a string-based icon registry so the API stays tree-shakeable and explicit.",
            "When adding icons from MIT libraries, keep a short source and license comment in the icon file itself.",
        ],
        renderPreview: () => (
            <Inline gap="md">
                <CopyIcon size={16} />
                <CheckIcon size={16} />
                <Heading3Icon size={20} />
            </Inline>
        ),
    },
    {
        slug: "text",
        title: "Text",
        summary: "Renders calm body copy with tone and weight variations for supporting content.",
        sectionId: "primitives",
        order: 1,
        usage: `<Text as="p" tone="muted">
  Supporting copy for the page.
</Text>`,
        notes: [
            'Use `tone="muted"` for secondary information.',
            'Use `weight="semibold"` when a short label needs emphasis without becoming a title.',
        ],
        renderPreview: () => (
            <Stack gap="sm">
                <Text as="p">
                    Typecase keeps long-form copy readable and intentionally neutral.
                </Text>
                <Text as="p" tone="muted">
                    Muted text works well for helper content, metadata, and section introductions.
                </Text>
                <Text as="p" weight="semibold">Semibold labels help frame the content.</Text>
            </Stack>
        ),
    },
    {
        slug: "title",
        title: "Title",
        summary: "Heading primitive for section titles, cards, and more expressive hero copy.",
        sectionId: "primitives",
        order: 2,
        usage: `<Title as="h2" size="lg">
  Documentation heading
</Title>`,
        notes: [
            "Use smaller sizes inside cards and sidebar headers.",
            "Use larger sizes in content headers, not inside dense control areas.",
        ],
        renderPreview: () => (
            <Stack gap="sm">
                <Title as="h3" size="sm">Sidebar heading</Title>
                <Title as="h2" size="md">Section heading</Title>
                <Title as="h1" size="lg">Page heading</Title>
            </Stack>
        ),
    },
    {
        slug: "anchor",
        title: "Anchor",
        summary: "Inline link primitive for lightweight calls to action and textual navigation.",
        sectionId: "primitives",
        order: 3,
        usage: `<Anchor href="/components/button">
  Read the button docs
</Anchor>`,
        notes: [
            "Use `Anchor` when the interaction should feel like text, not a button.",
            "It fits especially well in paragraphs, cards, and lightweight metadata areas.",
        ],
        renderPreview: () => (
            <Inline gap="lg">
                <Anchor href="/components/button">Read the button docs</Anchor>
                <Anchor href="/components/card" tone="muted">Open card examples</Anchor>
            </Inline>
        ),
    },
    {
        slug: "button",
        title: "Button",
        summary: "Action primitive with semantic variants and link support for common CTAs.",
        sectionId: "primitives",
        order: 4,
        usage: `<Inline gap="md">
  <Button>Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="ghost">Ghost</Button>
</Inline>`,
        notes: [
            "Variants belong to the component contract; the theme only defines how they look.",
            "When `href` is provided the button renders as a link without changing the public API.",
        ],
        renderPreview: () => (
            <Inline gap="md">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
            </Inline>
        ),
    },
    {
        slug: "badge",
        title: "Badge",
        summary: "Small label primitive for status, metadata, and compact categorization.",
        sectionId: "primitives",
        order: 5,
        usage: `<Cluster gap="sm">
  <Badge>Default</Badge>
  <Badge tone="primary">Primary</Badge>
  <Badge tone="info" variant="outline">Info</Badge>
  <Badge tone="success">Stable</Badge>
  <Badge tone="warning" variant="solid">Beta</Badge>
  <Badge tone="danger" variant="outline">Deprecated</Badge>
</Cluster>`,
        notes: [
            "Use badges for short labels, not primary actions.",
            "Tone and variant belong to the component API; themes decide the exact colors.",
            "Prefer concise text so badge rows stay scannable in documentation and tables.",
        ],
        renderPreview: () => (
            <Cluster gap="sm">
                <Badge>Default</Badge>
                <Badge tone="primary">Primary</Badge>
                <Badge tone="info" variant="outline">Info</Badge>
                <Badge tone="success">Stable</Badge>
                <Badge tone="warning" variant="solid">Beta</Badge>
                <Badge tone="danger" variant="outline">Deprecated</Badge>
            </Cluster>
        ),
    },
    {
        slug: "status-dot",
        title: "StatusDot",
        summary: "Tiny status indicator for availability, health, and compact state labels.",
        sectionId: "primitives",
        order: 5.25,
        usage: `<Inline gap="md">
  <Inline gap="sm">
    <StatusDot tone="success" pulse label="Online" />
    <Text>Online</Text>
  </Inline>
  <Inline gap="sm">
    <StatusDot tone="warning" label="Degraded" />
    <Text>Degraded</Text>
  </Inline>
  <Inline gap="sm">
    <StatusDot tone="danger" label="Offline" />
    <Text>Offline</Text>
  </Inline>
</Inline>`,
        notes: [
            "Use StatusDot when color is a compact supplement to nearby text, not the only source of meaning.",
            "Pass `label` when the dot stands alone; omit it when adjacent text already describes the status.",
            "Use `pulse` sparingly for live or changing states.",
        ],
        renderPreview: () => (
            <Inline gap="md">
                <Inline gap="sm">
                    <StatusDot tone="success" pulse label="Online" />
                    <Text>Online</Text>
                </Inline>
                <Inline gap="sm">
                    <StatusDot tone="warning" label="Degraded" />
                    <Text>Degraded</Text>
                </Inline>
                <Inline gap="sm">
                    <StatusDot tone="danger" label="Offline" />
                    <Text>Offline</Text>
                </Inline>
            </Inline>
        ),
    },
    {
        slug: "spinner",
        title: "Spinner",
        summary: "Small loading indicator for actions, inline states, and pending regions.",
        sectionId: "primitives",
        order: 6,
        usage: `<Inline gap="lg">
  <Inline gap="sm">
    <Spinner size="sm" />
    <Text tone="muted">Loading rows</Text>
  </Inline>
  <Spinner label="Loading preview" />
  <Spinner size="lg" />
</Inline>`,
        notes: [
            "Use Spinner for unknown-duration loading, especially beside text or actions.",
            "Pass `decorative` when nearby text already communicates the loading state.",
            "Use Skeleton when the layout of the pending content is already known.",
        ],
        renderPreview: () => (
            <Inline gap="lg">
                <Inline gap="sm">
                    <Spinner size="sm" />
                    <Text tone="muted">Loading rows</Text>
                </Inline>
                <Spinner label="Loading preview" />
                <Spinner size="lg" />
            </Inline>
        ),
    },
    {
        slug: "kbd",
        title: "Kbd",
        summary: "Inline keyboard key primitive for literal keys and small command labels.",
        sectionId: "primitives",
        order: 6.25,
        usage: `<Inline gap="sm">
  <Kbd>Enter</Kbd>
  <Text tone="muted">Submit the form</Text>
</Inline>`,
        notes: [
            "Use Kbd for literal keys and individual key names in documentation.",
            "Keep each physical key in its own Kbd so spacing remains readable.",
            "Use Shortcut when the UI should resolve a semantic chord like `Mod+K` per platform.",
            'Use `size="sm"` when the shortcut appears inside dense control text.',
        ],
        renderPreview: () => (
            <Inline gap="sm">
                <Kbd>Enter</Kbd>
                <Text tone="muted">Submit the form</Text>
            </Inline>
        ),
    },
    {
        slug: "shortcut",
        title: "Shortcut",
        summary:
            "Platform-aware shortcut primitive for semantic chords such as `Mod+K` and `Shift+Mod+P`.",
        sectionId: "primitives",
        order: 6.3,
        usage: `import { Shortcut, matchesShortcut } from "mainz/typecase";

<Shortcut chord="Mod+K" />

document.addEventListener("keydown", (event) => {
  if (matchesShortcut(event, "Mod+K")) {
    event.preventDefault();
    openPalette();
  }
});`,
        notes: [
            "Use semantic chords like `Mod+K`; `Mod` resolves to `⌘` on Apple platforms and `Ctrl` on standard platforms.",
            "Use Shortcut to render the UI and `matchesShortcut` to listen from the same chord string.",
            'Pass `platform="apple"` or `platform="standard"` when docs, previews, or host environments need an explicit override.',
            "Use Kbd for literal keys such as `Enter` or `Esc`, not for portable command chords.",
        ],
        renderPreview: () => (
            <Stack gap="md">
                <Inline gap="xl">
                    <Stack gap="sm">
                        <Text tone="muted" weight="semibold">Standard</Text>
                        <Shortcut chord="Mod+K" platform="standard" />
                    </Stack>
                    <Stack gap="sm">
                        <Text tone="muted" weight="semibold">Apple</Text>
                        <Shortcut chord="Mod+K" platform="apple" />
                    </Stack>
                </Inline>
                <Inline gap="sm">
                    <Shortcut chord="Shift+Mod+P" />
                    <Text tone="muted">Open quick actions</Text>
                </Inline>
                <Inline gap="sm">
                    <Shortcut chord="Alt+ArrowDown" platform="standard" />
                    <Text tone="muted">Move the current item down</Text>
                </Inline>
            </Stack>
        ),
    },
    {
        slug: "progress",
        title: "Progress",
        summary: "Determinate or indeterminate progress indicator for known work in progress.",
        sectionId: "primitives",
        order: 6.5,
        usage: `<Stack gap="md">
  <Progress label="Documentation coverage" value={64} />
  <Progress label="Loading results" />
  <Progress label="Publish progress" tone="success" value={88} />
</Stack>`,
        notes: [
            "Use Progress when a task has a known completion value, or omit `value` for an indeterminate state.",
            "Spinner works better for small unknown-duration waits; Progress works better for larger regions or multi-step work.",
            "Use `tone` only when the progress communicates semantic status.",
        ],
        renderPreview: () => (
            <Stack gap="md">
                <Progress label="Documentation coverage" value={64} />
                <Progress label="Loading results" />
                <Progress label="Publish progress" tone="success" value={88} />
            </Stack>
        ),
    },
    {
        slug: "skeleton",
        title: "Skeleton",
        summary: "Placeholder primitive for content shapes while data is loading.",
        sectionId: "primitives",
        order: 7,
        usage: `<Stack gap="md">
  <Inline gap="md" wrap={false}>
    <Skeleton variant="circle" width="2.5rem" />
    <Stack gap="sm" style="flex: 1;">
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="72%" />
    </Stack>
  </Inline>
  <Skeleton variant="block" height="7rem" />
</Stack>`,
        notes: [
            "Use Skeleton when the page already knows the rough shape of the loading content.",
            "Keep skeletons quiet and close to the eventual layout so loading does not feel jumpy.",
            "Set `label` only when the skeleton itself needs to announce loading to assistive tech.",
        ],
        renderPreview: () => (
            <Stack gap="md">
                <Inline gap="md" wrap={false}>
                    <Skeleton variant="circle" width="2.5rem" />
                    <Stack gap="sm" style="flex: 1;">
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="text" width="72%" />
                    </Stack>
                </Inline>
                <Skeleton variant="block" height="7rem" />
            </Stack>
        ),
    },
    {
        slug: "image",
        title: "Image",
        summary: "Responsive image primitive with fit, radius, and aspect-ratio controls.",
        sectionId: "primitives",
        order: 7.25,
        usage: `<Image
  alt="Soft blue illustration"
  aspectRatio="16 / 9"
  src="/typecase-media-preview.svg"
/>`,
        notes: [
            "Use Image when media needs Typecase sizing, object-fit, and radius tokens.",
            "Keep the native `alt` attribute meaningful for content images and empty for decorative images.",
            "Use Figure when the image needs a caption or nearby supporting copy.",
        ],
        renderPreview: () => (
            <Image
                alt="Soft blue illustration"
                aspectRatio="16 / 9"
                src="/typecase-media-preview.svg"
            />
        ),
    },
    {
        slug: "avatar",
        title: "Avatar",
        summary: "Compact identity primitive for people, teams, and fallback initials.",
        sectionId: "primitives",
        order: 7.5,
        usage: `<Inline gap="sm">
  <Avatar alt="Ada Lovelace">AL</Avatar>
  <Avatar
    alt="Typecase"
    src="/typecase-avatar.svg"
  />
  <Avatar alt="Mainz" size="lg" />
</Inline>`,
        notes: [
            "Use Avatar for small identity markers, not full media previews.",
            "When `src` is missing, the component renders the children or the first letter of `alt` as a fallback.",
            "Use `size` for component-level scale and theme tokens for color treatment.",
        ],
        renderPreview: () => (
            <Inline gap="sm">
                <Avatar alt="Ada Lovelace">AL</Avatar>
                <Avatar
                    alt="Typecase"
                    src="/typecase-avatar.svg"
                />
                <Avatar alt="Mainz" size="lg" />
            </Inline>
        ),
    },
    {
        slug: "label",
        title: "Label",
        summary:
            "Form label primitive for naming a single control with optional required treatment.",
        sectionId: "primitives",
        order: 8,
        usage: `<Stack gap="sm" style="max-width: 22rem;">
  <Label for="email" required>Email</Label>
  <Input id="email" placeholder="alex@example.com" />
</Stack>`,
        notes: [
            "Use Label with standalone controls or inside Field when you want the primitive directly.",
            "`required` only changes the visual treatment; validation still belongs to the app or a future pattern.",
        ],
        renderPreview: () => (
            <Stack gap="sm" style="max-width: 22rem;">
                <Label for="label-preview-email" required>Email</Label>
                <Input id="label-preview-email" placeholder="alex@example.com" />
            </Stack>
        ),
    },
    {
        slug: "input",
        title: "Input",
        summary: "Basic text control for forms, filters, and in-page search.",
        sectionId: "primitives",
        order: 9,
        usage: `<Stack gap="sm" style="max-width: 20rem;">
  <Label for="search-input">Search</Label>
  <Input id="search-input" placeholder="Search components" />
  <Input aria-invalid="true" placeholder="Invalid state" value="button" />
</Stack>`,
        notes: [
            "Keep labels outside the input so the control stays focused on data entry.",
            "Theming covers the border, focus ring, and surface tones.",
        ],
        renderPreview: () => (
            <Stack gap="sm" style="max-width: 22rem;">
                <Label for="preview-search">Search docs</Label>
                <Input id="preview-search" placeholder="Search components" />
                <Input aria-invalid="true" placeholder="Invalid state" value="button" />
            </Stack>
        ),
    },
    {
        slug: "textarea",
        title: "Textarea",
        summary: "Multi-line text control for comments, descriptions, and longer form input.",
        sectionId: "primitives",
        order: 10,
        usage: `<Stack gap="sm" style="max-width: 24rem;">
  <Label for="description">Description</Label>
  <Textarea id="description" placeholder="Write a short description" />
</Stack>`,
        notes: [
            "Use Textarea when the user edits multi-line text; Text remains the typography primitive.",
            "Use `resize` to control whether the browser resize handle is available.",
        ],
        renderPreview: () => (
            <Stack gap="sm" style="max-width: 24rem;">
                <Label for="textarea-preview-description">Description</Label>
                <Textarea
                    id="textarea-preview-description"
                    placeholder="Write a short description"
                />
            </Stack>
        ),
    },
    {
        slug: "select",
        title: "Select",
        summary: "Native select control styled to match the rest of Typecase form inputs.",
        sectionId: "primitives",
        order: 11,
        usage: `<Stack gap="sm" style="max-width: 22rem;">
  <Label for="status">Status</Label>
  <Select id="status" value="draft">
    <option value="draft">Draft</option>
    <option value="published">Published</option>
    <option value="archived">Archived</option>
  </Select>
</Stack>`,
        notes: [
            "Use Select for compact native choices when a custom menu is unnecessary.",
            "For searchable or command-like choices, use a higher-level pattern instead.",
        ],
        renderPreview: () => (
            <Stack gap="sm" style="max-width: 22rem;">
                <Label for="select-preview-status">Status</Label>
                <Select id="select-preview-status" value="draft">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </Select>
            </Stack>
        ),
    },
    {
        slug: "switch",
        title: "Switch",
        summary: "Binary preference control for compact settings, feature flags, and live toggles.",
        sectionId: "primitives",
        order: 11.75,
        usage: `<Stack gap="sm" style="max-width: 24rem;">
  <Switch defaultChecked>Enable preview mode</Switch>
  <Switch size="sm">Compact mode</Switch>
</Stack>`,
        notes: [
            "Use Switch for immediate on/off preferences and settings, not for multi-choice selection.",
            "Switch behaves like a checkbox semantically, but communicates a toggled state more clearly in settings UIs.",
            "Use Checkbox when the control belongs inside forms with list-like choices.",
        ],
        renderPreview: () => (
            <Stack gap="sm" style="max-width: 24rem;">
                <Switch defaultChecked>Enable preview mode</Switch>
                <Switch size="sm">Compact mode</Switch>
            </Stack>
        ),
    },
    {
        slug: "checkbox",
        title: "Checkbox",
        summary: "Boolean choice control with Typecase spacing, focus, and invalid treatment.",
        sectionId: "primitives",
        order: 12,
        usage: `<Stack gap="sm">
  <Checkbox defaultChecked name="compact">Use compact layout</Checkbox>
  <Checkbox name="updates">Send product updates</Checkbox>
  <Checkbox invalid name="terms">I understand this is required</Checkbox>
</Stack>`,
        notes: [
            "Use Checkbox for independent yes/no choices.",
            "The component wraps the native input with its label so simple cases stay compact.",
        ],
        renderPreview: () => (
            <Stack gap="sm">
                <Checkbox defaultChecked name="compact">Use compact layout</Checkbox>
                <Checkbox name="updates">Send product updates</Checkbox>
                <Checkbox invalid name="terms">I understand this is required</Checkbox>
            </Stack>
        ),
    },
    {
        slug: "radio",
        title: "Radio",
        summary: "Single-choice option control intended to be grouped inside Fieldset.",
        sectionId: "primitives",
        order: 13,
        usage: `<Fieldset>
  <Fieldset.Legend>Theme preference</Fieldset.Legend>
  <Fieldset.Body>
    <Radio defaultChecked name="theme-preview" value="auto">Auto</Radio>
    <Radio name="theme-preview" value="light">Light</Radio>
    <Radio name="theme-preview" value="dark">Dark</Radio>
  </Fieldset.Body>
</Fieldset>`,
        notes: [
            "Use Radio for mutually exclusive options that share the same `name`.",
            "Use Fieldset to provide the group label and supporting copy.",
        ],
        renderPreview: () => (
            <Fieldset>
                <Fieldset.Legend>Theme preference</Fieldset.Legend>
                <Fieldset.Body>
                    <Radio defaultChecked name="theme-preview" value="auto">Auto</Radio>
                    <Radio name="theme-preview" value="light">Light</Radio>
                    <Radio name="theme-preview" value="dark">Dark</Radio>
                </Fieldset.Body>
            </Fieldset>
        ),
    },
    {
        slug: "divider",
        title: "Divider",
        summary: "Simple horizontal rule for visually separating sections without heavy chrome.",
        sectionId: "primitives",
        order: 14,
        usage: `<Stack gap="md">
  <Text>Above the divider</Text>
  <Divider />
  <Text tone="muted">Below the divider</Text>
</Stack>`,
        notes: [
            "It is most useful between stacked content blocks.",
            "Prefer `Divider` over ad hoc border wrappers when the intention is separation.",
        ],
        renderPreview: () => (
            <Stack gap="md">
                <Text>Header content</Text>
                <Divider />
                <Text tone="muted">Secondary content</Text>
            </Stack>
        ),
    },
    {
        slug: "container",
        title: "Container",
        summary: "Centers content and defines the readable width of a page region.",
        sectionId: "layout",
        order: 1,
        usage: `<Container maxWidth="xl" padding="lg">
  <Title as="h1" size="xl">Centered docs content</Title>
</Container>`,
        notes: [
            "Use it near the page root or around large sections that need consistent horizontal rhythm.",
            "It is intentionally boring so examples do not drift into ad hoc wrappers.",
        ],
        renderPreview: () => (
            <Container maxWidth="md" padding="sm">
                <Text tone="muted">This content stays centered by the container.</Text>
            </Container>
        ),
    },
    {
        slug: "section",
        title: "Section",
        summary:
            "Semantic vertical block for page sections with a calmer default rhythm than raw wrappers.",
        sectionId: "layout",
        order: 2,
        usage: `<Section gap="lg">
  <Title as="h2" size="md">Section</Title>
  <Text tone="muted">Support copy</Text>
  <Button>Continue</Button>
</Section>`,
        notes: [
            "Use it when the wrapper is semantically a section of the page, not just a generic stack.",
            "It pairs well with `Title`, `Text`, previews, and notes in docs flows.",
        ],
        renderPreview: () => (
            <Section gap="md">
                <Title as="h3" size="sm">Stacked block</Title>
                <Text tone="muted">Each child gets a predictable vertical gap.</Text>
                <Button size="sm">Continue</Button>
            </Section>
        ),
    },
    {
        slug: "stack",
        title: "Stack",
        summary: "Vertical layout primitive that keeps spacing explicit and reusable.",
        sectionId: "layout",
        order: 3,
        usage: `<Stack gap="lg">
  <Title as="h2" size="md">Section</Title>
  <Text tone="muted">Support copy</Text>
  <Button>Continue</Button>
</Stack>`,
        notes: [
            'Use `align="flex-start"` when children should keep content width instead of stretching.',
            "It is ideal for sections, forms, cards, and hero copy.",
        ],
        renderPreview: () => (
            <Stack align="flex-start" gap="md">
                <Title as="h3" size="sm">Stacked block</Title>
                <Text tone="muted">Each child gets a predictable vertical gap.</Text>
                <Button size="sm">Continue</Button>
            </Stack>
        ),
    },
    {
        slug: "inline",
        title: "Inline",
        summary: "Horizontal grouping primitive with wrap support for controls and metadata.",
        sectionId: "layout",
        order: 4,
        usage: `<Inline gap="md" justify="space-between">
  <Text weight="semibold">Toolbar</Text>
  <Button variant="secondary">Action</Button>
</Inline>`,
        notes: [
            "Use it for toolbars, action rows, and compact metadata lines.",
            "It wraps by default so it degrades well on narrow screens.",
        ],
        renderPreview: () => (
            <Inline gap="md" justify="space-between">
                <Inline gap="sm">
                    <Button size="sm" variant="secondary">Filter</Button>
                    <Button size="sm" variant="ghost">Sort</Button>
                </Inline>
                <Anchor href="/components/grid">See grid</Anchor>
            </Inline>
        ),
    },
    {
        slug: "cluster",
        title: "Cluster",
        summary:
            "Compact wrapped grouping for chips, tags, and actions that should stay visually close.",
        sectionId: "layout",
        order: 5,
        usage: `<Cluster gap="sm">
  <Button size="sm" variant="secondary">TypeScript</Button>
  <Button size="sm" variant="ghost">Mainz</Button>
  <Button size="sm" variant="ghost">Docs</Button>
</Cluster>`,
        notes: [
            "Use it when items should wrap naturally but still read like one compact group.",
            "It is especially helpful for tag rows, action clusters, and metadata pills.",
        ],
        renderPreview: () => (
            <Cluster gap="sm">
                <Button size="sm" variant="secondary">TypeScript</Button>
                <Button size="sm" variant="ghost">Mainz</Button>
                <Button size="sm" variant="ghost">Docs</Button>
                <Button size="sm" variant="ghost">Layout</Button>
            </Cluster>
        ),
    },
    {
        slug: "center",
        title: "Center",
        summary:
            "Centers a region in the available space and optionally constrains its readable width.",
        sectionId: "layout",
        order: 6,
        usage: `<Center maxWidth="md" axis="both" minHeight="16rem">
  <Stack gap="sm">
    <Title as="h2" size="md">Empty state</Title>
    <Text tone="muted">Nothing here yet.</Text>
  </Stack>
</Center>`,
        notes: [
            'Use `axis="both"` when an empty state or focused block should center vertically too.',
            "It is narrower and lighter than `Container`, so it works well for local states.",
        ],
        renderPreview: () => (
            <Surface padding="sm" variant="subtle">
                <Center axis="both" maxWidth="sm" minHeight="10rem">
                    <Stack gap="sm">
                        <Title as="h3" size="sm">Centered state</Title>
                        <Text tone="muted">Focused content stays calm and narrow.</Text>
                    </Stack>
                </Center>
            </Surface>
        ),
    },
    {
        slug: "spacer",
        title: "Spacer",
        summary:
            "Flexible fill item for inline and flex-based rows when one side should push the other away.",
        sectionId: "layout",
        order: 7,
        usage: `<Inline wrap={false}>
  <Text>Leading</Text>
  <Spacer />
  <Button size="sm">Action</Button>
</Inline>`,
        notes: [
            'Use it when `justify="space-between"` would be too blunt and you want one flexible gap in the row.',
            "It works best in `Inline`, `Navbar`, and other flex-based groupings.",
        ],
        renderPreview: () => (
            <Inline wrap={false}>
                <Text>Leading</Text>
                <Spacer />
                <Button size="sm" variant="secondary">Action</Button>
            </Inline>
        ),
    },
    {
        slug: "inset",
        title: "Inset",
        summary:
            "Padding wrapper for places where a region needs internal breathing room without inventing ad hoc styles.",
        sectionId: "layout",
        order: 8,
        usage: `<Inset padding="md" paddingX="lg">
  <Text tone="muted">Inset content</Text>
</Inset>`,
        notes: [
            "Use it when padding is the concern and `Surface` would add too much visual treatment.",
            "You can override horizontal and vertical padding independently with `paddingX` and `paddingY`.",
        ],
        renderPreview: () => (
            <Surface padding="sm" variant="subtle">
                <Inset padding="sm" paddingX="lg" style="background: rgba(255, 255, 255, 0.55);">
                    <Text tone="muted">
                        Inset content keeps local rhythm without adding a card.
                    </Text>
                </Inset>
            </Surface>
        ),
    },
    {
        slug: "grid",
        title: "Grid",
        summary:
            "Responsive grid primitive for cards, documentation blocks, and comparison layouts.",
        sectionId: "layout",
        order: 9,
        usage: `<Grid gap="lg" minItemWidth="16rem">
  <Surface>One</Surface>
  <Surface>Two</Surface>
  <Surface>Three</Surface>
</Grid>`,
        notes: [
            "Use `minItemWidth` when card collections should wrap naturally.",
            "Use `columns` for more explicit layouts in denser docs surfaces.",
        ],
        renderPreview: () => (
            <Grid gap="md" minItemWidth="10rem">
                <Surface padding="sm" variant="subtle">
                    <Text>Item one</Text>
                </Surface>
                <Surface padding="sm" variant="subtle">
                    <Text>Item two</Text>
                </Surface>
                <Surface padding="sm" variant="subtle">
                    <Text>Item three</Text>
                </Surface>
            </Grid>
        ),
    },
    {
        slug: "surface",
        title: "Surface",
        summary:
            "Reusable panel wrapper for calm background, border, radius, and elevation treatment.",
        sectionId: "layout",
        order: 10,
        usage: `<Surface variant="subtle" padding="lg">
  <Text tone="muted">Useful for side panels and grouped previews.</Text>
</Surface>`,
        notes: [
            "Use `subtle` for quiet grouped regions and `ghost` when you only want spacing.",
            "It keeps the baseline visual language consistent without dictating structure.",
        ],
        renderPreview: () => (
            <Grid columns={3} gap="md">
                <Surface padding="sm">
                    <Text>Default</Text>
                </Surface>
                <Surface padding="sm" variant="subtle">
                    <Text>Subtle</Text>
                </Surface>
                <Surface padding="sm" variant="ghost">
                    <Text>Ghost</Text>
                </Surface>
            </Grid>
        ),
    },
    {
        slug: "scroll-area",
        title: "ScrollArea",
        summary: "Adds local overflow handling without changing the main document scroll model.",
        sectionId: "layout",
        order: 11,
        usage: `<ScrollArea maxHeight="16rem">
  <List variant="nav">...</List>
</ScrollArea>`,
        notes: [
            "Use it when a local region needs its own overflow, like sidebars or dense rails.",
            "It works best alongside sticky layout regions instead of replacing document scroll.",
        ],
        renderPreview: () => (
            <Surface padding="sm" variant="subtle">
                <ScrollArea maxHeight="10rem">
                    <List variant="nav">
                        <List.Item active href="/components/scroll-area">ScrollArea</List.Item>
                        <List.Item href="/components/split">Split</List.Item>
                        <List.Item href="/components/button">Button</List.Item>
                        <List.Item href="/components/card">Card</List.Item>
                        <List.Item href="/components/offcanvas">Offcanvas</List.Item>
                        <List.Item href="/components/snippet">Snippet</List.Item>
                    </List>
                </ScrollArea>
            </Surface>
        ),
    },
    {
        slug: "screen",
        title: "Screen",
        summary:
            "Page-level canvas that defines the root surface for a screen without prescribing internal regions.",
        sectionId: "layout",
        order: 12,
        usage: `<Screen background="#f8fafc" color="#0f172a">
  <Topbar>...</Topbar>
  <Container maxWidth="2xl">
    ...
  </Container>
</Screen>`,
        notes: [
            "Use it to define the outer screen surface while keeping layout behavior in child components like `Topbar`, `Split`, and `ScrollArea`.",
            "It stays intentionally small: canvas, min-height, background, and color.",
        ],
        renderPreview: () => (
            <Surface padding="sm" variant="subtle">
                <Screen
                    background="#f8fafc"
                    color="#0f172a"
                    minHeight="22rem"
                    style="border: 1px solid var(--tc-color-border); border-radius: 1rem; overflow: hidden;"
                >
                    <Topbar style="--tc-topbar-bg: rgba(248, 250, 252, 0.92);">
                        <Container maxWidth="full" padding="sm">
                            <Navbar minHeight="3.5rem">
                                <Navbar.Brand>
                                    <Anchor href="/">Typecase</Anchor>
                                </Navbar.Brand>
                            </Navbar>
                        </Container>
                    </Topbar>
                    <Stack gap="md" style="padding: 1rem;">
                        <Text tone="muted">
                            The screen owns the canvas. The children own the behavior and internal
                            layout.
                        </Text>
                        <Anchor href="/components/topbar">See Topbar</Anchor>
                    </Stack>
                </Screen>
            </Surface>
        ),
    },
    {
        slug: "show",
        title: "Show",
        summary:
            "Responsive visibility wrapper for breakpoint-based presentation without conditional rendering logic in JSX.",
        sectionId: "layout",
        order: 13,
        usage: `<Show below="md">
  <Button variant="ghost">Menu</Button>
</Show>`,
        notes: [
            "Use `below`, `above`, or `between` when a child should only participate at certain breakpoints.",
            "It keeps responsive visibility in composition instead of pushing viewport logic into component render methods.",
        ],
        renderPreview: () => (
            <Stack align="flex-start" gap="md">
                <Show below="md">
                    <Button size="sm" variant="ghost">Below md</Button>
                </Show>
                <Show above="md">
                    <Text tone="muted">Above md</Text>
                </Show>
                <Show between={["sm", "md"]}>
                    <Anchor href="/components/show">Between sm and md</Anchor>
                </Show>
            </Stack>
        ),
    },
    {
        slug: "split",
        title: "Split",
        summary:
            "Structural layout composite for start, main, and optional end regions in docs and app shells.",
        sectionId: "layout",
        order: 14,
        usage: `<Split startWidth="18rem" endWidth="16rem" gap="xl" collapseBelow="md">
  <Split.Start sticky top="4.75rem">...</Split.Start>
  <Split.Main>...</Split.Main>
  <Split.End>...</Split.End>
</Split>`,
        notes: [
            "Use `startWidth` and `endWidth` to opt into two or three-column layouts.",
            "Keep document scrolling on `Main`; combine sticky side regions with `ScrollArea` when needed.",
        ],
        renderPreview: () => (
            <Surface padding="sm" variant="subtle">
                <Split collapseBelow="md" endWidth="9rem" gap="md" startWidth="10rem">
                    <Split.Start>
                        <Surface padding="sm">
                            <Text tone="muted">Start</Text>
                        </Surface>
                    </Split.Start>
                    <Split.Main>
                        <Surface padding="sm">
                            <Text>Main content follows document scroll.</Text>
                        </Surface>
                    </Split.Main>
                    <Split.End>
                        <Surface padding="sm">
                            <Text tone="muted">End</Text>
                        </Surface>
                    </Split.End>
                </Split>
            </Surface>
        ),
    },
    {
        slug: "breadcrumb",
        title: "Breadcrumb",
        summary:
            "Composite navigation trail for showing where the current page sits in a hierarchy.",
        sectionId: "composites",
        order: 0.5,
        usage: `<Breadcrumb>
  <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
  <Breadcrumb.Item href="/components">Components</Breadcrumb.Item>
  <Breadcrumb.Item active>Breadcrumb</Breadcrumb.Item>
</Breadcrumb>`,
        notes: [
            "Use Breadcrumb for page hierarchy, not for primary navigation.",
            "The active item renders as the current page and should normally not be a link.",
            "Keep labels short so the trail wraps gracefully on smaller screens.",
        ],
        renderPreview: () => (
            <Breadcrumb>
                <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
                <Breadcrumb.Item href="/components">Components</Breadcrumb.Item>
                <Breadcrumb.Item href="/components">Composites</Breadcrumb.Item>
                <Breadcrumb.Item active>Breadcrumb</Breadcrumb.Item>
            </Breadcrumb>
        ),
    },
    {
        slug: "pagination",
        title: "Pagination",
        summary:
            "Composite navigation list for paged collections when the caller owns the current page.",
        sectionId: "composites",
        order: 0.75,
        usage: `<Pagination label="Component pages">
  <Pagination.Item disabled label="Previous page">
    Previous
  </Pagination.Item>
  <Pagination.Item active href="?page=1" label="Page 1">1</Pagination.Item>
  <Pagination.Item href="?page=2" label="Page 2">2</Pagination.Item>
  <Pagination.Ellipsis />
  <Pagination.Item href="?page=8" label="Page 8">8</Pagination.Item>
  <Pagination.Item href="?page=2" label="Next page">
    Next
  </Pagination.Item>
</Pagination>`,
        notes: [
            "Pagination is a composite: it renders the structure, while the caller decides the active page and navigation target.",
            "Use `href` for link-based navigation or `onSelect` when a client pattern owns page changes.",
            "Keep long labels in `aria-label` and short visible text inside the item.",
        ],
        renderPreview: () => (
            <Pagination label="Component pages">
                <Pagination.Item disabled label="Previous page">Previous</Pagination.Item>
                <Pagination.Item active href="?page=1" label="Page 1">1</Pagination.Item>
                <Pagination.Item href="?page=2" label="Page 2">2</Pagination.Item>
                <Pagination.Ellipsis />
                <Pagination.Item href="?page=8" label="Page 8">8</Pagination.Item>
                <Pagination.Item href="?page=2" label="Next page">Next</Pagination.Item>
            </Pagination>
        ),
    },
    {
        slug: "steps",
        title: "Steps",
        summary:
            "Controlled step list for setup flows, publishing progress, and documentation sequences.",
        sectionId: "composites",
        order: 0.85,
        usage: `<Steps label="Publish flow">
  <Steps.Item status="complete">
    <Steps.Indicator>1</Steps.Indicator>
    <Steps.Content>
      <Steps.Title>Define</Steps.Title>
      <Steps.Description>Document the component API.</Steps.Description>
    </Steps.Content>
  </Steps.Item>
  <Steps.Item status="current">
    <Steps.Indicator>2</Steps.Indicator>
    <Steps.Content>
      <Steps.Title>Preview</Steps.Title>
      <Steps.Description>Check the rendered example.</Steps.Description>
    </Steps.Content>
  </Steps.Item>
  <Steps.Item>
    <Steps.Indicator>3</Steps.Indicator>
    <Steps.Content>
      <Steps.Title>Ship</Steps.Title>
      <Steps.Description>Publish the docs page.</Steps.Description>
    </Steps.Content>
  </Steps.Item>
</Steps>`,
        notes: [
            "Steps is a composite: the caller owns current/completed status and any navigation behavior.",
            "Use it for small linear flows, not for arbitrary navigation menus.",
            'Use `orientation="horizontal"` when space allows and step descriptions are short.',
        ],
        renderPreview: () => (
            <Steps label="Publish flow">
                <Steps.Item status="complete">
                    <Steps.Indicator>1</Steps.Indicator>
                    <Steps.Content>
                        <Steps.Title>Define</Steps.Title>
                        <Steps.Description>Document the component API.</Steps.Description>
                    </Steps.Content>
                </Steps.Item>
                <Steps.Item status="current">
                    <Steps.Indicator>2</Steps.Indicator>
                    <Steps.Content>
                        <Steps.Title>Preview</Steps.Title>
                        <Steps.Description>Check the rendered example.</Steps.Description>
                    </Steps.Content>
                </Steps.Item>
                <Steps.Item>
                    <Steps.Indicator>3</Steps.Indicator>
                    <Steps.Content>
                        <Steps.Title>Ship</Steps.Title>
                        <Steps.Description>Publish the docs page.</Steps.Description>
                    </Steps.Content>
                </Steps.Item>
            </Steps>
        ),
    },
    {
        slug: "card",
        title: "Card",
        summary:
            "Open composite for grouped content with header, body, footer, and title subcomponents.",
        sectionId: "composites",
        order: 1,
        usage: `<Card>
  <Card.Header>
    <Card.Title>Announcement</Card.Title>
  </Card.Header>
  <Card.Body>
    <Text tone="muted">Use subcomponents to shape the content.</Text>
  </Card.Body>
</Card>`,
        notes: [
            "Card stays open for TSX composition and does not own the interaction model.",
            "It works well as the base for more opinionated patterns later.",
        ],
        renderPreview: () => (
            <Card>
                <Card.Header>
                    <Card.Title>Open composition</Card.Title>
                    <Button size="sm" variant="secondary">Inspect</Button>
                </Card.Header>
                <Card.Body>
                    <Text tone="muted">
                        Structure stays in JSX, so the caller decides the exact composition.
                    </Text>
                </Card.Body>
                <Card.Footer>
                    <Button href="/components/meta-table" size="sm">Read more</Button>
                </Card.Footer>
            </Card>
        ),
    },
    {
        slug: "link-box",
        title: "LinkBox",
        summary:
            "Composite linkable content block for cards and summaries where the main link stretches over the region.",
        sectionId: "composites",
        order: 1.25,
        usage: `<LinkBox variant="subtle">
  <LinkBox.Meta>
    <Badge tone="primary" variant="outline">Guide</Badge>
  </LinkBox.Meta>
  <LinkBox.Link href="/components/card">
    Composable cards
  </LinkBox.Link>
  <LinkBox.Body>
    <Text tone="muted">
      Build a clickable summary while keeping nested controls possible.
    </Text>
  </LinkBox.Body>
</LinkBox>`,
        notes: [
            "Use LinkBox when the whole card should feel clickable but the main link still stays explicit in the markup.",
            "The stretched link is `LinkBox.Link`; body and metadata remain open composition.",
            "Avoid putting another primary link inside the same LinkBox unless it needs to be independently interactive.",
        ],
        renderPreview: () => (
            <LinkBox variant="subtle">
                <LinkBox.Meta>
                    <Badge tone="primary" variant="outline">Guide</Badge>
                </LinkBox.Meta>
                <LinkBox.Link href="/components/card">Composable cards</LinkBox.Link>
                <LinkBox.Body>
                    <Text tone="muted">
                        Build a clickable summary while keeping nested controls possible.
                    </Text>
                </LinkBox.Body>
            </LinkBox>
        ),
    },
    {
        slug: "callout",
        title: "Callout",
        summary: "Composite for contextual notes, warnings, and documentation guidance.",
        sectionId: "composites",
        order: 1.5,
        usage: `<Stack gap="md">
  <Callout tone="info">
    <Callout.Icon>
      <CheckIcon size={16} />
    </Callout.Icon>
    <Callout.Title>Composable guidance</Callout.Title>
    <Callout.Body>
      <Text tone="muted">
        Use callouts when a note belongs to the surrounding content but should
        be easier to scan.
      </Text>
    </Callout.Body>
    <Callout.Actions>
      <Button href="/components/badge" size="sm" variant="secondary">
        See Badge
      </Button>
    </Callout.Actions>
  </Callout>
  <Callout tone="warning" variant="outline">
    <Callout.Title>Use sparingly</Callout.Title>
    <Callout.Body>
      <Text tone="muted">
        A warning tone works best for short and concrete guidance.
      </Text>
    </Callout.Body>
  </Callout>
</Stack>`,
        notes: [
            "Callout is a composite because the caller owns the exact content and actions.",
            "Use `tone` for semantic intent, and keep the theme responsible for the exact palette.",
            "The icon is optional; without it the callout collapses into a simple single-column block.",
        ],
        renderPreview: () => (
            <Stack gap="md">
                <Callout tone="info">
                    <Callout.Icon>
                        <CheckIcon size={16} />
                    </Callout.Icon>
                    <Callout.Title>Composable guidance</Callout.Title>
                    <Callout.Body>
                        <Text tone="muted">
                            Use callouts when a note belongs to the surrounding content but should
                            be easier to scan.
                        </Text>
                    </Callout.Body>
                    <Callout.Actions>
                        <Button href="/components/badge" size="sm" variant="secondary">
                            See Badge
                        </Button>
                    </Callout.Actions>
                </Callout>
                <Callout tone="warning" variant="outline">
                    <Callout.Title>Use sparingly</Callout.Title>
                    <Callout.Body>
                        <Text tone="muted">
                            A warning tone works best for short and concrete guidance.
                        </Text>
                    </Callout.Body>
                </Callout>
            </Stack>
        ),
    },
    {
        slug: "alert",
        title: "Alert",
        summary:
            "Feedback composite for short status messages that should be announced to assistive tech.",
        sectionId: "composites",
        order: 1.6,
        usage: `<Alert tone="success">
  <Alert.Icon>
    <StatusDot pulse tone="success" />
  </Alert.Icon>
  <Alert.Title>Build completed</Alert.Title>
  <Alert.Body>
    <Text tone="muted">
      The documentation preview is ready to inspect.
    </Text>
  </Alert.Body>
  <Alert.Actions>
    <Button size="sm" variant="secondary">Open preview</Button>
  </Alert.Actions>
</Alert>`,
        notes: [
            "Use Alert for user-facing status feedback; use Callout for contextual documentation guidance.",
            'The default role is `status`; use `role="alert"` only for urgent messages.',
            "Alert is still a composite: callers own the icon, copy, and actions.",
        ],
        renderPreview: () => (
            <Alert tone="success">
                <Alert.Icon>
                    <StatusDot pulse tone="success" />
                </Alert.Icon>
                <Alert.Title>Build completed</Alert.Title>
                <Alert.Body>
                    <Text tone="muted">
                        The documentation preview is ready to inspect.
                    </Text>
                </Alert.Body>
                <Alert.Actions>
                    <Button size="sm" variant="secondary">Open preview</Button>
                </Alert.Actions>
            </Alert>
        ),
    },
    {
        slug: "toast",
        title: "Toast",
        summary:
            "Compact feedback surface for short-lived confirmations, updates, and lightweight action prompts.",
        sectionId: "composites",
        order: 1.7,
        usage: `<Toast tone="info">
  <Toast.Title>Draft saved</Toast.Title>
  <Toast.Body>
    <Text tone="muted">
      Your component draft is available in the local workspace.
    </Text>
  </Toast.Body>
  <Toast.Actions>
    <Button size="sm" variant="secondary">Open draft</Button>
  </Toast.Actions>
</Toast>`,
        notes: [
            "Toast is a visual composite; it does not own queueing, timers, or stacking.",
            'Use `role="alert"` only when the message is urgent enough to interrupt assistive tech users.',
            "A future Toast manager pattern can build on top of this structure without changing the surface.",
        ],
        renderPreview: () => (
            <Toast tone="info">
                <Toast.Title>Draft saved</Toast.Title>
                <Toast.Body>
                    <Text tone="muted">
                        Your component draft is available in the local workspace.
                    </Text>
                </Toast.Body>
                <Toast.Actions>
                    <Button size="sm" variant="secondary">Open draft</Button>
                </Toast.Actions>
            </Toast>
        ),
    },
    {
        slug: "code-block",
        title: "CodeBlock",
        summary:
            "Composite for code presentation with a header, language label, actions, and body.",
        sectionId: "composites",
        order: 2,
        usage: `<CodeBlock>
  <CodeBlock.Header>
    <CodeBlock.Language>tsx</CodeBlock.Language>
  </CodeBlock.Header>
  <CodeBlock.Body>{\`<Button>Save</Button>\`}</CodeBlock.Body>
</CodeBlock>`,
        notes: [
            "Use it when the caller still owns the surrounding structure and actions.",
            "Patterns like `Snippet` can build on top of it to add behavior.",
        ],
        renderPreview: () => (
            <CodeBlock>
                <CodeBlock.Header>
                    <CodeBlock.Language>tsx</CodeBlock.Language>
                    <CodeBlock.Actions>
                        <Button
                            aria-label="Copy"
                            className="tc-snippet-copy-button"
                            size="sm"
                            title="Copy"
                            variant="ghost"
                        >
                            <CopyIcon aria-hidden="true" size={16} />
                            <span className="tc-visually-hidden">Copy</span>
                        </Button>
                    </CodeBlock.Actions>
                </CodeBlock.Header>
                <CodeBlock.Body>{`<Button variant="secondary">Save</Button>`}</CodeBlock.Body>
            </CodeBlock>
        ),
    },
    {
        slug: "list",
        title: "List",
        summary:
            "Composite list and item pair for navigation menus, grouped links, and simple item stacks.",
        sectionId: "composites",
        order: 3,
        usage: `<List variant="nav">
  <List.Item active href="/components/button">Button</List.Item>
  <List.Item href="/components/card">Card</List.Item>
</List>`,
        notes: [
            "Use the default variant for simple item collections and `nav` for navigation lists.",
            "The active state belongs to the item so a sidebar can reflect the current page clearly.",
        ],
        renderPreview: () => (
            <List variant="nav">
                <List.Item active href="/components/list">List</List.Item>
                <List.Item href="/components/offcanvas">Offcanvas</List.Item>
                <List.Item href="/components/snippet">Snippet</List.Item>
            </List>
        ),
    },
    {
        slug: "tabs",
        title: "Tabs",
        summary: "Controlled composite for tabbed sections when the caller owns the active state.",
        sectionId: "composites",
        order: 3.5,
        usage: `<Stack gap="lg">
  <Tabs variant="line">
    <Tabs.List label="Documentation sections">
      <Tabs.Tab active controls="tabs-preview-overview">
        Overview
      </Tabs.Tab>
      <Tabs.Tab controls="tabs-preview-api">API</Tabs.Tab>
      <Tabs.Tab controls="tabs-preview-examples">Examples</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel id="tabs-preview-overview">
      <Text tone="muted">
        The caller decides which tab is active and which panel is visible.
      </Text>
    </Tabs.Panel>
    <Tabs.Panel active={false} id="tabs-preview-api">
      <Text tone="muted">API details can live here.</Text>
    </Tabs.Panel>
    <Tabs.Panel active={false} id="tabs-preview-examples">
      <Text tone="muted">Examples can live here.</Text>
    </Tabs.Panel>
  </Tabs>
  <Tabs size="sm" variant="pills">
    <Tabs.List label="Preview mode">
      <Tabs.Tab active>Preview</Tabs.Tab>
      <Tabs.Tab>Code</Tabs.Tab>
    </Tabs.List>
  </Tabs>
</Stack>`,
        notes: [
            "Tabs is a composite: it provides structure and styling, while active state belongs to the caller.",
            "Use the `line` variant for documentation sections and `pills` for denser local controls.",
            "A future Tabs pattern can add keyboard navigation and internal selection without changing the composite contract.",
        ],
        renderPreview: () => (
            <Stack gap="lg">
                <Tabs variant="line">
                    <Tabs.List label="Documentation sections">
                        <Tabs.Tab active controls="tabs-preview-overview">
                            Overview
                        </Tabs.Tab>
                        <Tabs.Tab controls="tabs-preview-api">API</Tabs.Tab>
                        <Tabs.Tab controls="tabs-preview-examples">Examples</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel id="tabs-preview-overview">
                        <Text tone="muted">
                            The caller decides which tab is active and which panel is visible.
                        </Text>
                    </Tabs.Panel>
                    <Tabs.Panel active={false} id="tabs-preview-api">
                        <Text tone="muted">API details can live here.</Text>
                    </Tabs.Panel>
                    <Tabs.Panel active={false} id="tabs-preview-examples">
                        <Text tone="muted">Examples can live here.</Text>
                    </Tabs.Panel>
                </Tabs>
                <Tabs size="sm" variant="pills">
                    <Tabs.List label="Preview mode">
                        <Tabs.Tab active>Preview</Tabs.Tab>
                        <Tabs.Tab>Code</Tabs.Tab>
                    </Tabs.List>
                </Tabs>
            </Stack>
        ),
    },
    {
        slug: "accordion",
        title: "Accordion",
        summary:
            "Disclosure composite for grouped questions, implementation notes, and progressively revealed sections.",
        sectionId: "composites",
        order: 3.6,
        usage: `<Accordion>
  <Accordion.Item open>
    <Accordion.Trigger>What belongs in a primitive?</Accordion.Trigger>
    <Accordion.Panel>
      <Text tone="muted">
        Small, reusable controls and typography without a full use-case baked in.
      </Text>
    </Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item>
    <Accordion.Trigger>Why use a composite?</Accordion.Trigger>
    <Accordion.Panel>
      <Text tone="muted">
        Composites keep structure open while leaving state and behavior to the caller.
      </Text>
    </Accordion.Panel>
  </Accordion.Item>
</Accordion>`,
        notes: [
            "Accordion uses native `details` and `summary`, so disclosure state stays declarative and browser-owned.",
            "Use `open` on `Accordion.Item` for default expanded sections in static docs or SSG output.",
            "This keeps the component squarely in the composite layer instead of pushing disclosure state into a pattern too early.",
        ],
        renderPreview: () => (
            <Accordion>
                <Accordion.Item open>
                    <Accordion.Trigger>What belongs in a primitive?</Accordion.Trigger>
                    <Accordion.Panel>
                        <Text tone="muted">
                            Small, reusable controls and typography without a full use-case baked
                            in.
                        </Text>
                    </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item>
                    <Accordion.Trigger>Why use a composite?</Accordion.Trigger>
                    <Accordion.Panel>
                        <Text tone="muted">
                            Composites keep structure open while leaving state and behavior to the
                            caller.
                        </Text>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        ),
    },
    {
        slug: "table",
        title: "Table",
        summary: "Composite table structure for tabular data with head, body, row, and cell parts.",
        sectionId: "composites",
        order: 4,
        usage: `<Table caption="Component coverage" density="compact" striped>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Component</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell align="end">Examples</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Button</Table.Cell>
      <Table.Cell>
        <Badge tone="success">Stable</Badge>
      </Table.Cell>
      <Table.Cell align="end">4</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Skeleton</Table.Cell>
      <Table.Cell>
        <Badge tone="primary" variant="outline">New</Badge>
      </Table.Cell>
      <Table.Cell align="end">2</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Table</Table.Cell>
      <Table.Cell>
        <Badge tone="primary" variant="outline">New</Badge>
      </Table.Cell>
      <Table.Cell align="end">1</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>`,
        notes: [
            "Use Table for real tabular data, not layout grids.",
            "It is intentionally controlled and structural; sorting, pagination, and row selection belong to a future DataTable pattern.",
            "Use MetaTable when the content is only a small label/value list.",
        ],
        renderPreview: () => (
            <Table caption="Component coverage" density="compact" striped>
                <Table.Head>
                    <Table.Row>
                        <Table.HeaderCell>Component</Table.HeaderCell>
                        <Table.HeaderCell>Status</Table.HeaderCell>
                        <Table.HeaderCell align="end">Examples</Table.HeaderCell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell>Button</Table.Cell>
                        <Table.Cell>
                            <Badge tone="success">Stable</Badge>
                        </Table.Cell>
                        <Table.Cell align="end">4</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell>Skeleton</Table.Cell>
                        <Table.Cell>
                            <Badge tone="primary" variant="outline">New</Badge>
                        </Table.Cell>
                        <Table.Cell align="end">2</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell>Table</Table.Cell>
                        <Table.Cell>
                            <Badge tone="primary" variant="outline">New</Badge>
                        </Table.Cell>
                        <Table.Cell align="end">1</Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table>
        ),
    },
    {
        slug: "description-list",
        title: "DescriptionList",
        summary: "Semantic term and details list for specifications, metadata, and API notes.",
        sectionId: "composites",
        order: 4.05,
        usage: `<DescriptionList layout="inline" variant="bordered">
  <DescriptionList.Item>
    <DescriptionList.Term>Package</DescriptionList.Term>
    <DescriptionList.Details>mainz/typecase</DescriptionList.Details>
  </DescriptionList.Item>
  <DescriptionList.Item>
    <DescriptionList.Term>Layer</DescriptionList.Term>
    <DescriptionList.Details>Composite</DescriptionList.Details>
  </DescriptionList.Item>
</DescriptionList>`,
        notes: [
            "Use DescriptionList when the information is naturally term/details and should keep native `dl` semantics.",
            'Use `layout="inline"` for compact specs and `layout="stacked"` for longer descriptions.',
            "MetaTable remains a compact data-driven helper; DescriptionList is more TSX-composable.",
        ],
        renderPreview: () => (
            <DescriptionList layout="inline" variant="bordered">
                <DescriptionList.Item>
                    <DescriptionList.Term>Package</DescriptionList.Term>
                    <DescriptionList.Details>mainz/typecase</DescriptionList.Details>
                </DescriptionList.Item>
                <DescriptionList.Item>
                    <DescriptionList.Term>Layer</DescriptionList.Term>
                    <DescriptionList.Details>Composite</DescriptionList.Details>
                </DescriptionList.Item>
            </DescriptionList>
        ),
    },
    {
        slug: "empty-state",
        title: "EmptyState",
        summary:
            "Composite block for no-results, first-run, or cleared content states with optional icon and actions.",
        sectionId: "composites",
        order: 4.1,
        usage: `<EmptyState variant="subtle">
  <EmptyState.Icon>
    <SearchIcon aria-hidden="true" size={18} />
  </EmptyState.Icon>
  <EmptyState.Title>No results</EmptyState.Title>
  <EmptyState.Body>
    <Text tone="muted">
      Try a different component name or clear the active filters.
    </Text>
  </EmptyState.Body>
  <EmptyState.Actions>
    <Button size="sm" variant="secondary">Clear filters</Button>
  </EmptyState.Actions>
</EmptyState>`,
        notes: [
            "Use EmptyState when the region has no content to show yet but can explain what happened.",
            "It is a composite: the caller owns the exact copy, icon, and actions.",
            'Use `variant="subtle"` when the state needs a quiet boundary inside a larger surface.',
        ],
        renderPreview: () => (
            <EmptyState variant="subtle">
                <EmptyState.Icon>
                    <SearchIcon aria-hidden="true" size={18} />
                </EmptyState.Icon>
                <EmptyState.Title>No results</EmptyState.Title>
                <EmptyState.Body>
                    <Text tone="muted">
                        Try a different component name or clear the active filters.
                    </Text>
                </EmptyState.Body>
                <EmptyState.Actions>
                    <Button size="sm" variant="secondary">Clear filters</Button>
                </EmptyState.Actions>
            </EmptyState>
        ),
    },
    {
        slug: "stat",
        title: "Stat",
        summary: "Compact metric block for counts, summaries, and dashboard-style highlights.",
        sectionId: "composites",
        order: 4.12,
        usage: `<Grid columns={3} gap="md">
  <Stat variant="subtle">
    <Stat.Label>Components</Stat.Label>
    <Stat.Value>42</Stat.Value>
    <Stat.HelpText>documented examples</Stat.HelpText>
  </Stat>
  <Stat variant="subtle">
    <Stat.Label>Pages</Stat.Label>
    <Stat.Value>31</Stat.Value>
    <Stat.HelpText>regular routes</Stat.HelpText>
  </Stat>
  <Stat variant="subtle">
    <Stat.Label>Theme</Stat.Label>
    <Stat.Value>2</Stat.Value>
    <Stat.HelpText>schemes ready</Stat.HelpText>
  </Stat>
</Grid>`,
        notes: [
            "Use Stat when a number or short value is the primary content.",
            "It is a composite because the caller owns the label, value, and helper copy.",
            'Use `variant="subtle"` when the metric needs a local surface; use the default variant inside existing cards.',
        ],
        renderPreview: () => (
            <Grid columns={3} gap="md">
                <Stat variant="subtle">
                    <Stat.Label>Components</Stat.Label>
                    <Stat.Value>42</Stat.Value>
                    <Stat.HelpText>documented examples</Stat.HelpText>
                </Stat>
                <Stat variant="subtle">
                    <Stat.Label>Pages</Stat.Label>
                    <Stat.Value>31</Stat.Value>
                    <Stat.HelpText>regular routes</Stat.HelpText>
                </Stat>
                <Stat variant="subtle">
                    <Stat.Label>Theme</Stat.Label>
                    <Stat.Value>2</Stat.Value>
                    <Stat.HelpText>schemes ready</Stat.HelpText>
                </Stat>
            </Grid>
        ),
    },
    {
        slug: "figure",
        title: "Figure",
        summary:
            "Semantic wrapper for media and captions; the media itself is supplied by the caller.",
        sectionId: "composites",
        order: 4.15,
        usage: `<Figure align="center">
  <Image
    alt="Soft blue illustration"
    aspectRatio="16 / 9"
    src="/typecase-media-preview.svg"
  />
  <Figure.Caption>
    Media with supporting caption.
  </Figure.Caption>
</Figure>`,
        notes: [
            "`Figure` owns the native `figure` element, spacing, optional alignment, and `Figure.Caption`.",
            "`Image` in this example is not part of Figure; it is just the media passed as children.",
            "Use Figure when the media and caption should be understood as one semantic unit.",
            "Figure stays open: pass Image, video, custom media, or any JSX as the figure content.",
        ],
        renderPreview: () => (
            <Figure align="center">
                <Image
                    alt="Soft blue illustration"
                    aspectRatio="16 / 9"
                    src="/typecase-media-preview.svg"
                />
                <Figure.Caption>Media with supporting caption.</Figure.Caption>
            </Figure>
        ),
    },
    {
        slug: "field",
        title: "Field",
        summary:
            "Composite form field wrapper for label, control, hint, and validation error copy.",
        sectionId: "composites",
        order: 4.25,
        usage: `<Stack gap="lg">
  <Field>
    <Field.Label for="field-preview-title" required>Title</Field.Label>
    <Input id="field-preview-title" placeholder="Component title" />
    <Field.Hint>Use a short title that works in navigation.</Field.Hint>
  </Field>
  <Field invalid>
    <Field.Label for="field-preview-description" required>
      Description
    </Field.Label>
    <Field.Control>
      <Textarea
        id="field-preview-description"
        invalid
        placeholder="Write a short description"
      />
    </Field.Control>
    <Field.Error>Description is required.</Field.Error>
  </Field>
</Stack>`,
        notes: [
            "Field is a composite: it displays form structure and validation copy, but does not validate by itself.",
            "Use Field.Control when you need a wrapper around one or more controls.",
            "A future form pattern can own validation state while continuing to render this structure.",
        ],
        renderPreview: () => (
            <Stack gap="lg">
                <Field>
                    <Field.Label for="field-preview-title" required>Title</Field.Label>
                    <Input id="field-preview-title" placeholder="Component title" />
                    <Field.Hint>Use a short title that works in navigation.</Field.Hint>
                </Field>
                <Field invalid>
                    <Field.Label for="field-preview-description" required>Description</Field.Label>
                    <Field.Control>
                        <Textarea
                            id="field-preview-description"
                            invalid
                            placeholder="Write a short description"
                        />
                    </Field.Control>
                    <Field.Error>Description is required.</Field.Error>
                </Field>
            </Stack>
        ),
    },
    {
        slug: "fieldset",
        title: "Fieldset",
        summary: "Composite for grouping related form choices with a legend and supporting text.",
        sectionId: "composites",
        order: 4.35,
        usage: `<Stack gap="lg">
  <Fieldset>
    <Fieldset.Legend>Theme preference</Fieldset.Legend>
    <Fieldset.Hint>Choose the initial preference for this site.</Fieldset.Hint>
    <Fieldset.Body>
      <Radio defaultChecked name="fieldset-theme-preview" value="auto">
        Auto
      </Radio>
      <Radio name="fieldset-theme-preview" value="light">Light</Radio>
      <Radio name="fieldset-theme-preview" value="dark">Dark</Radio>
    </Fieldset.Body>
  </Fieldset>
  <Fieldset invalid>
    <Fieldset.Legend>Notifications</Fieldset.Legend>
    <Fieldset.Body>
      <Checkbox name="release-notes">Release notes</Checkbox>
      <Checkbox name="security">Security updates</Checkbox>
    </Fieldset.Body>
    <Fieldset.Error>Select at least one notification type.</Fieldset.Error>
  </Fieldset>
</Stack>`,
        notes: [
            "Use Fieldset when multiple controls share the same question or context.",
            "It pairs naturally with Radio and Checkbox groups.",
            "Like Field, it can show error copy without owning validation state.",
        ],
        renderPreview: () => (
            <Stack gap="lg">
                <Fieldset>
                    <Fieldset.Legend>Theme preference</Fieldset.Legend>
                    <Fieldset.Hint>Choose the initial preference for this site.</Fieldset.Hint>
                    <Fieldset.Body>
                        <Radio defaultChecked name="fieldset-theme-preview" value="auto">
                            Auto
                        </Radio>
                        <Radio name="fieldset-theme-preview" value="light">Light</Radio>
                        <Radio name="fieldset-theme-preview" value="dark">Dark</Radio>
                    </Fieldset.Body>
                </Fieldset>
                <Fieldset invalid>
                    <Fieldset.Legend>Notifications</Fieldset.Legend>
                    <Fieldset.Body>
                        <Checkbox name="release-notes">Release notes</Checkbox>
                        <Checkbox name="security">Security updates</Checkbox>
                    </Fieldset.Body>
                    <Fieldset.Error>Select at least one notification type.</Fieldset.Error>
                </Fieldset>
            </Stack>
        ),
    },
    {
        slug: "meta-table",
        title: "MetaTable",
        summary: "Small structured table for metadata pairs such as dates, labels, and categories.",
        sectionId: "composites",
        order: 4.5,
        usage: `<MetaTable
  items={[
    { label: "Date", value: "February 5, 2026" },
    { label: "Category", value: "Announcements" },
  ]}
/>`,
        notes: [
            "Use it when the information is naturally label/value oriented.",
            "It works especially well in editorial cards and side rails.",
        ],
        renderPreview: () => (
            <MetaTable
                items={[
                    { label: "Date", value: "February 5, 2026" },
                    { label: "Category", value: "Announcements" },
                    { label: "Status", value: "Draft" },
                ]}
            />
        ),
    },
    {
        slug: "dropdown",
        title: "Dropdown",
        summary:
            "Controlled composite for anchored menu structure when another component owns the open state.",
        sectionId: "composites",
        order: 5,
        usage: `<Dropdown open align="end">
  <Dropdown.Trigger>
    <Button size="sm" variant="secondary">Options</Button>
  </Dropdown.Trigger>
  <Dropdown.Menu>
    <Dropdown.Item active>Overview</Dropdown.Item>
    <Dropdown.Item>Examples</Dropdown.Item>
  </Dropdown.Menu>
</Dropdown>`,
        notes: [
            "Use it when the caller or a pattern owns the menu state and interaction model.",
            "Dropdown is a composite: it gives you the structure and styling, but it does not decide when the menu opens or toggles.",
            "Use DropdownMenu when you want the open and close behavior ready to use.",
            "The preview pins `open` on purpose so the structure is visible without adding local behavior to the composite.",
        ],
        renderPreview: () => (
            <Dropdown open align="start">
                <Dropdown.Trigger>
                    <Button size="sm" variant="secondary">Options</Button>
                </Dropdown.Trigger>
                <Dropdown.Menu>
                    <Dropdown.Item active>Overview</Dropdown.Item>
                    <Dropdown.Item>Examples</Dropdown.Item>
                    <Dropdown.Item>API reference</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        ),
    },
    {
        slug: "popover",
        title: "Popover",
        summary:
            "Controlled composite for anchored floating content when another component owns open state and positioning decisions.",
        sectionId: "composites",
        order: 6,
        usage: `<Popover open placement="bottom" align="start">
  <Popover.Anchor>
    <Button size="sm" variant="secondary">Details</Button>
  </Popover.Anchor>
  <Popover.Content maxWidth="18rem">
    <Text tone="muted">Short contextual content.</Text>
  </Popover.Content>
</Popover>`,
        notes: [
            "Use it when the caller or a pattern owns the behavior, just like Dropdown.",
            "Popover gives you the anchored structure and styling without deciding hover, click, focus, or dismissal rules.",
            "Use PopoverTrigger when you want the common click-to-open behavior ready to use.",
        ],
        renderPreview: () => (
            <Popover open placement="bottom" align="start">
                <Popover.Anchor>
                    <Button size="sm" variant="secondary">Details</Button>
                </Popover.Anchor>
                <Popover.Content maxWidth="18rem">
                    <Stack gap="sm">
                        <Text weight="semibold">Contextual panel</Text>
                        <Text tone="muted">
                            The composite stays open here so the structure is visible.
                        </Text>
                    </Stack>
                </Popover.Content>
            </Popover>
        ),
    },
    {
        slug: "dialog",
        title: "Dialog",
        summary:
            "Controlled composite for modal dialog structure when another component owns open state and dismissal behavior.",
        sectionId: "composites",
        order: 7,
        usage: `<Dialog open>
  <Dialog.Panel label="Example dialog" size="md">
    <Dialog.Header>
      <Dialog.Title>Confirm action</Dialog.Title>
    </Dialog.Header>
    <Dialog.Body>
      <Text tone="muted">This action can be reviewed before continuing.</Text>
    </Dialog.Body>
    <Dialog.Footer>
      <Button variant="ghost">Cancel</Button>
      <Button>Continue</Button>
    </Dialog.Footer>
  </Dialog.Panel>
</Dialog>`,
        notes: [
            "Use Dialog when the caller owns open state, dismissal, and any focus behavior.",
            "Dialog supplies the backdrop, centered panel, and structural subcomponents.",
            "Use Modal when you want the common trigger, Portal, Escape, and backdrop behavior ready to use.",
        ],
        renderPreview: () => (
            <Surface padding="lg" variant="subtle">
                <Dialog open showBackdrop={false} style="position: relative; min-height: 16rem;">
                    <Dialog.Panel label="Example dialog" size="sm">
                        <Dialog.Header>
                            <Dialog.Title>Confirm action</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Text tone="muted">
                                The composite stays controlled by its caller.
                            </Text>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button size="sm" variant="ghost">Cancel</Button>
                            <Button size="sm">Continue</Button>
                        </Dialog.Footer>
                    </Dialog.Panel>
                </Dialog>
            </Surface>
        ),
    },
    {
        slug: "navbar",
        title: "Navbar",
        summary: "Composite for top-level headers with brand, navigation, and action regions.",
        sectionId: "composites",
        order: 8,
        usage: `<Navbar>
  <Navbar.Start>...</Navbar.Start>
  <Navbar.Brand>...</Navbar.Brand>
  <Navbar.Nav>...</Navbar.Nav>
  <Navbar.Actions>...</Navbar.Actions>
</Navbar>`,
        notes: [
            "Use it for top bars and app headers without baking product-specific styling into the component.",
            "Use `Start` for leading controls that are not part of the brand, such as a mobile menu toggle.",
        ],
        renderPreview: () => (
            <Navbar>
                <Navbar.Start>
                    <Button size="sm" variant="ghost">Menu</Button>
                </Navbar.Start>
                <Navbar.Brand>
                    <Anchor href="/">Typecase</Anchor>
                </Navbar.Brand>
                <Navbar.Nav>
                    <Anchor href="/components/button" tone="muted">Components</Anchor>
                </Navbar.Nav>
                <Navbar.Actions>
                    <Button size="sm" variant="ghost">Menu</Button>
                </Navbar.Actions>
            </Navbar>
        ),
    },
    {
        slug: "topbar",
        title: "Topbar",
        summary:
            "Sticky app-level bar wrapper for headers that need border, background, and optional blur.",
        sectionId: "composites",
        order: 9,
        usage: `<Topbar blur sticky top="0" variant="strong" zIndex={30}>
  <Container maxWidth="full" padding="lg">
    <Navbar>...</Navbar>
  </Container>
</Topbar>`,
        notes: [
            "Use it to frame app and documentation headers without pushing sticky shell chrome into local CSS.",
            "Use variants to keep contrast and emphasis on-theme instead of hardcoding header colors in local CSS.",
        ],
        renderPreview: () => (
            <Topbar
                blur
                style="border-radius: 0.75rem;"
                variant="strong"
            >
                <Container maxWidth="full" padding="sm">
                    <Navbar minHeight="3.5rem">
                        <Navbar.Brand>
                            <Anchor href="/">Typecase</Anchor>
                        </Navbar.Brand>
                        <Navbar.Actions>
                            <Button size="sm" variant="ghost">Menu</Button>
                        </Navbar.Actions>
                    </Navbar>
                </Container>
            </Topbar>
        ),
    },
    {
        slug: "offcanvas",
        title: "Offcanvas",
        summary:
            "Bootstrap-style sliding panel composite that can work as overlay, inline, or responsive sidebar.",
        sectionId: "composites",
        order: 10,
        usage: `<Offcanvas mode="responsive" open width="18rem">
  <Offcanvas.Header>
    <Offcanvas.Title>Browse docs</Offcanvas.Title>
  </Offcanvas.Header>
  <Offcanvas.Body>
    <List variant="nav">...</List>
  </Offcanvas.Body>
</Offcanvas>`,
        notes: [
            "The component stays stateless; callers decide when it is open and how dismissal works.",
            'Use `mode="responsive"` when the same panel should be inline on desktop and overlay on mobile.',
        ],
        renderPreview: () => (
            <Offcanvas mode="inline" open showBackdrop={false} width="18rem">
                <Offcanvas.Header>
                    <Offcanvas.Title>Browse components</Offcanvas.Title>
                    <Button size="sm" variant="ghost">Close</Button>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <List variant="nav">
                        <List.Item active href="/components/offcanvas">Offcanvas</List.Item>
                        <List.Item href="/components/list">List</List.Item>
                        <List.Item href="/components/button">Button</List.Item>
                    </List>
                </Offcanvas.Body>
            </Offcanvas>
        ),
    },
    {
        slug: "snippet",
        title: "Snippet",
        summary: "Pattern component that closes the code block structure and owns the copy action.",
        sectionId: "patterns",
        order: 1,
        usage: `<Snippet language="ts">
  {\`const theme = "editorial";\`}
</Snippet>`,
        notes: [
            "Snippet is a pattern because it owns the copy interaction in its own render tree.",
            "Use it for the common copyable code case instead of rebuilding the action every time.",
        ],
        renderPreview: () => <Snippet language="ts">{`const theme = "editorial";`}</Snippet>,
    },
    {
        slug: "on-this-page",
        title: "OnThisPage",
        summary:
            "Pattern for page-local tables of contents that highlight the current anchor and render nested section links.",
        sectionId: "patterns",
        order: 2,
        usage: `<OnThisPage
  items={[
    { id: "overview", label: "Overview" },
    {
      id: "usage",
      label: "Usage",
      items: [
        { id: "tsx", label: "TSX" },
        { id: "props", label: "Props" },
      ],
    },
  ]}
/>`,
        notes: [
            "This is a pattern because it owns active-link state and reacts to hash changes in its own render tree.",
            "Start with explicit `items`; automatic heading collection can be layered on top later without changing the public contract.",
        ],
        renderPreview: () => (
            <OnThisPage
                items={[
                    { id: "overview", label: "Overview" },
                    {
                        id: "supported-content",
                        items: [
                            { id: "brand", label: "Brand" },
                            { id: "text", label: "Text" },
                            { id: "image", label: "Image" },
                        ],
                        label: "Supported content",
                    },
                    { id: "placement", label: "Placement" },
                    { id: "scrolling", label: "Scrolling" },
                ]}
                maxHeight="15rem"
            />
        ),
    },
    {
        slug: "drawer",
        title: "Drawer",
        summary:
            "Pattern that owns offcanvas open, close, Escape, backdrop dismissal, and portal placement for common drawer UI.",
        sectionId: "patterns",
        order: 3,
        usage: `<Drawer
  trigger={<Button size="sm" variant="secondary">Open menu</Button>}
  width="18rem"
>
  <Drawer.Header>
    <Drawer.Title>Menu</Drawer.Title>
    <Drawer.Close size="sm">Close</Drawer.Close>
  </Drawer.Header>
  <Drawer.Body>...</Drawer.Body>
</Drawer>`,
        notes: [
            "Drawer is a pattern over the Offcanvas composite; use Offcanvas directly when you need a controlled or inline layout.",
            "The open drawer is rendered through a Portal overlay layer so it can escape local overflow and z-index boundaries.",
        ],
        renderPreview: () => (
            <Drawer
                trigger={<Button size="sm" variant="secondary">Open drawer</Button>}
                width="18rem"
            >
                <Drawer.Header>
                    <Drawer.Title>Menu</Drawer.Title>
                    <Drawer.Close size="sm">Close</Drawer.Close>
                </Drawer.Header>
                <Drawer.Body>
                    <List variant="nav">
                        <List.Item active href="/components/drawer">Drawer</List.Item>
                        <List.Item href="/components/offcanvas">Offcanvas</List.Item>
                        <List.Item href="/components/list">List</List.Item>
                    </List>
                </Drawer.Body>
            </Drawer>
        ),
    },
    {
        slug: "dropdown-menu",
        title: "DropdownMenu",
        summary:
            "Pattern that owns dropdown open, close, outside-click, and Escape behavior for simple menu actions.",
        sectionId: "patterns",
        order: 4,
        usage: `<DropdownMenu onSelect={(value) => console.log(value)}>
  <DropdownMenu.Trigger>
    <Button size="sm" variant="secondary">Theme</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item active shortcut="Mod+K" value="search">Search</DropdownMenu.Item>
    <DropdownMenu.Item value="theme">Theme</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`,
        notes: [
            "Use DropdownMenu when you want the common menu behavior without each pattern reimplementing open state.",
            "Keep case-specific logic in the caller by handling `onSelect`; ThemeSwitch uses this to focus only on theme preference changes.",
            'Menu items can render a portable shortcut with `shortcut="Mod+K"` without taking ownership of the keyboard listener.',
        ],
        renderPreview: () => (
            <DropdownMenu align="start">
                <DropdownMenu.Trigger>
                    <Button size="sm" variant="secondary">Open menu</Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item active shortcut="Mod+K" value="search">
                        Search
                    </DropdownMenu.Item>
                    <DropdownMenu.Item value="examples">Examples</DropdownMenu.Item>
                    <DropdownMenu.Item value="api">API reference</DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu>
        ),
    },
    {
        slug: "popover-trigger",
        title: "PopoverTrigger",
        summary:
            "Pattern that owns click-to-open popover state, outside-click dismissal, Escape, and portal placement.",
        sectionId: "patterns",
        order: 5,
        usage: `<PopoverTrigger placement="bottom" align="start">
  <PopoverTrigger.Anchor>
    <Button size="sm" variant="secondary">Details</Button>
  </PopoverTrigger.Anchor>
  <PopoverTrigger.Content maxWidth="18rem">
    <Text tone="muted">Short contextual content.</Text>
  </PopoverTrigger.Content>
</PopoverTrigger>`,
        notes: [
            "PopoverTrigger is a pattern over the Popover composite; use Popover directly when the caller owns the open state.",
            "The floating content is rendered through a Portal popover layer so it can escape local overflow and z-index boundaries.",
            "Tooltip uses the same floating placement infrastructure, but with hover and focus decisions instead of click.",
        ],
        renderPreview: () => (
            <PopoverTrigger placement="bottom" align="start">
                <PopoverTrigger.Anchor>
                    <Button size="sm" variant="secondary">Open popover</Button>
                </PopoverTrigger.Anchor>
                <PopoverTrigger.Content maxWidth="18rem">
                    <Stack gap="sm">
                        <Text weight="semibold">Portaled popover</Text>
                        <Text tone="muted">
                            Click outside or press Escape to close this panel.
                        </Text>
                    </Stack>
                </PopoverTrigger.Content>
            </PopoverTrigger>
        ),
    },
    {
        slug: "modal",
        title: "Modal",
        summary:
            "Pattern that owns dialog open state, trigger behavior, Portal placement, backdrop dismissal, and Escape.",
        sectionId: "patterns",
        order: 6,
        usage: `<Modal
  label="Confirm action"
  trigger={<Button size="sm" variant="secondary">Open modal</Button>}
>
  <Modal.Header>
    <Modal.Title>Confirm action</Modal.Title>
    <Modal.Close size="sm">Close</Modal.Close>
  </Modal.Header>
  <Modal.Body>
    <Text tone="muted">Review the details before continuing.</Text>
  </Modal.Body>
  <Modal.Footer>
    <Modal.Close variant="ghost">Cancel</Modal.Close>
    <Button>Continue</Button>
  </Modal.Footer>
</Modal>`,
        notes: [
            "Modal is a pattern over the Dialog composite; use Dialog directly when the caller needs full control.",
            "It renders through the Portal overlay layer so the panel can escape local overflow and stacking contexts.",
            "The first version handles trigger, Escape, backdrop dismissal, close buttons, and initial panel focus. Focus trap and scroll lock can layer on next.",
        ],
        renderPreview: () => (
            <Modal
                label="Confirm action"
                trigger={<Button size="sm" variant="secondary">Open modal</Button>}
            >
                <Modal.Header>
                    <Modal.Title>Confirm action</Modal.Title>
                    <Modal.Close size="sm">Close</Modal.Close>
                </Modal.Header>
                <Modal.Body>
                    <Text tone="muted">
                        Review the details before continuing with this action.
                    </Text>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Close size="sm" variant="ghost">Cancel</Modal.Close>
                    <Button size="sm">Continue</Button>
                </Modal.Footer>
            </Modal>
        ),
    },
    {
        slug: "tooltip",
        title: "Tooltip",
        summary:
            "Pattern for brief hover and focus help text that renders through the popover portal layer.",
        sectionId: "patterns",
        order: 7,
        usage: `<Tooltip content="Opens the component catalog" placement="top">
  <Button size="sm" variant="secondary">Browse</Button>
</Tooltip>`,
        notes: [
            "Tooltip is a pattern because it owns hover, focus, delay, Escape, and portal placement behavior.",
            "Keep tooltip content short; use PopoverTrigger when the content is interactive or needs richer structure.",
            "Use `openDelay` and `closeDelay` for local tuning, but prefer the defaults for normal help text.",
        ],
        renderPreview: () => (
            <Inline gap="md">
                <Tooltip content="Opens a short contextual hint" placement="top">
                    <Button size="sm" variant="secondary">Hover or focus me</Button>
                </Tooltip>
                <Tooltip
                    content="Tooltips can align with the start edge"
                    align="start"
                    placement="bottom"
                >
                    <Button size="sm" variant="ghost">Start aligned</Button>
                </Tooltip>
            </Inline>
        ),
    },
    {
        slug: "theme-switch",
        title: "ThemeSwitch",
        summary:
            "Pattern for choosing light, dark, or auto preference in a way that works with TypecaseRoot theme resolution.",
        sectionId: "patterns",
        order: 8,
        usage: `<TypecaseRoot themes={[editorialTheme, darkTheme]} defaultPreference="auto">
  <ThemeSwitch />
</TypecaseRoot>`,
        notes: [
            "ThemeSwitch expects to live inside a TypecaseRoot so it can read the current preference and request changes.",
            "It works best when the host maps light and dark schemes to concrete themes and decides whether preference is controlled or persisted.",
        ],
        renderPreview: () => (
            <TypecaseRoot
                defaultPreference="auto"
                storageKey={false}
                themes={[editorialTheme, darkTheme]}
            >
                <ThemeSwitch />
            </TypecaseRoot>
        ),
    },
] as const;

export function listTypecaseDocs(): readonly TypecaseDocEntry[] {
    return docs;
}

export function listTypecaseDocSlugs(): readonly string[] {
    return docs.map((doc) => doc.slug);
}

export function getTypecaseDocBySlug(slug: string): TypecaseDocEntry | undefined {
    return docs.find((doc) => doc.slug === slug);
}

export function listTypecaseDocNavSections(): readonly TypecaseDocNavSection[] {
    const sections = new Map<
        TypecaseDocSectionId,
        { title: string; items: Array<{ slug: string; title: string }> }
    >();

    for (const doc of docs) {
        const section = sections.get(doc.sectionId) ?? {
            title: sectionMeta[doc.sectionId].title,
            items: [],
        };

        section.items.push({
            slug: doc.slug,
            title: doc.title,
        });

        sections.set(doc.sectionId, section);
    }

    return Array.from(sections.entries())
        .sort(([leftId], [rightId]) => sectionMeta[leftId].order - sectionMeta[rightId].order)
        .map(([id, section]) => ({
            id,
            title: section.title,
            items: section.items.sort((left, right) => {
                const leftDoc = getTypecaseDocBySlug(left.slug);
                const rightDoc = getTypecaseDocBySlug(right.slug);
                return (leftDoc?.order ?? 0) - (rightDoc?.order ?? 0);
            }),
        }));
}

export function getTypecaseSectionTitle(sectionId: TypecaseDocSectionId): string {
    return sectionMeta[sectionId].title;
}

export function countDocsInSection(sectionId: TypecaseDocSectionId): number {
    return docs.filter((doc) => doc.sectionId === sectionId).length;
}

export function renderOverviewEditorialPreview() {
    return (
        <TypecaseRoot theme={draculaTheme}>
            <Surface variant="ghost" padding="sm">
                <Stack gap="lg">
                    <Inline gap="md" justify="space-between">
                        <Title as="h3" size="lg">Dracula preview</Title>
                        <Button href="/components/offcanvas" size="sm">
                            See sidebar components
                        </Button>
                    </Inline>
                    <Grid gap="lg" minItemWidth="16rem">
                        <Surface as="article" padding="lg">
                            <Stack gap="lg" style="min-height: 18rem;">
                                <Stack gap="sm">
                                    <Title as="h4" size="md">Night mode for dense reading</Title>
                                    <Text
                                        as="p"
                                        style="font-family: var(--tc-font-family-heading);"
                                    >
                                        A darker editorial surface can still feel calm, legible, and
                                        intentional when the tokens stay cohesive.
                                    </Text>
                                </Stack>
                                <Stack align="flex-start" gap="lg" style="margin-top: auto;">
                                    <MetaTable
                                        items={[
                                            { label: "Theme", value: "dracula" },
                                            { label: "Mode", value: "preview" },
                                        ]}
                                    />
                                    <Button href="/components/card" size="sm">Read the post</Button>
                                </Stack>
                            </Stack>
                        </Surface>
                        <Surface as="article" padding="lg">
                            <Stack gap="lg" style="min-height: 18rem;">
                                <Stack gap="sm">
                                    <Title as="h4" size="md">Contrast without noise</Title>
                                    <Text
                                        as="p"
                                        style="font-family: var(--tc-font-family-heading);"
                                    >
                                        The same catalog can shift from neutral docs to a more
                                        atmospheric showcase without changing the component API.
                                    </Text>
                                </Stack>
                                <Stack align="flex-start" gap="lg" style="margin-top: auto;">
                                    <MetaTable
                                        items={[
                                            { label: "Accent", value: "violet" },
                                            { label: "Surface", value: "low-light" },
                                        ]}
                                    />
                                    <Button href="/components/typecase-root" size="sm">
                                        Theme details
                                    </Button>
                                </Stack>
                            </Stack>
                        </Surface>
                    </Grid>
                </Stack>
            </Surface>
        </TypecaseRoot>
    );
}
