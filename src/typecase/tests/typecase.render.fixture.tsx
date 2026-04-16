import { Component, defineCommand } from "mainz";
import {
    cleanupAppCommandRegistry,
    ensureAppCommandRegistry,
} from "../../commands/runtime.ts";
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
    ChevronDownIcon,
    Cluster,
    CodeBlock,
    CommandLauncher,
    Container,
    CopyIcon,
    darkTheme,
    DescriptionList,
    Dialog,
    Divider,
    Drawer,
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
    lightTheme,
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
    QuickMenu,
    Radio,
    Screen,
    ScrollArea,
    SearchIcon,
    SearchPalette,
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
    SunIcon,
    Switch,
    Table,
    Tabs,
    Text,
    Textarea,
    ThemeSwitch,
    Title,
    Toast,
    Toolbar,
    Tooltip,
    Topbar,
    TypecaseRoot,
} from "mainz/typecase";

export class TypecaseRenderFixture extends Component<unknown, { commandRuns: number }> {
    protected override initState() {
        return {
            commandRuns: 0,
        };
    }

    override onMount(): void {
        ensureAppCommandRegistry({
            appId: "typecase-fixture-app",
            commands: [
                defineCommand({
                    id: "typecase.fixture.command",
                    description: "Runs a fixture-level command action.",
                    execute: () => {
                        this.setState({
                            commandRuns: this.state.commandRuns + 1,
                        });
                    },
                    shortcuts: ["Alt+Shift+P"],
                    title: "Run fixture command",
                }),
            ],
            root: this,
        });
    }

    override onUnmount(): void {
        cleanupAppCommandRegistry(this);
    }

    override render(): HTMLElement | DocumentFragment {
        return (
            <div style="display: grid; gap: 40px;">
                <TypecaseRoot data-testid="outer-theme-root">
                    <Screen data-testid="screen" background="#f8fafc" color="#0f172a">
                        <Topbar
                            data-testid="topbar"
                            blur
                            sticky
                            top="0"
                            variant="strong"
                            zIndex={30}
                        >
                            <Navbar minHeight="3.5rem">
                                <Navbar.Brand>
                                    <Anchor href="/">Typecase</Anchor>
                                </Navbar.Brand>
                                <Navbar.Actions>
                                    <Button size="sm" variant="ghost">Menu</Button>
                                </Navbar.Actions>
                            </Navbar>
                        </Topbar>

                        <div style="display: grid; gap: 1.5rem;">
                            <Card data-testid="card">
                                <Card.Header>
                                    <Card.Title>Typecase Card</Card.Title>
                                    <Button
                                        data-testid="header-action"
                                        size="sm"
                                        variant="secondary"
                                    >
                                        Secondary
                                    </Button>
                                </Card.Header>

                                <Card.Body>
                                    <Text as="p" tone="muted">
                                        Neutral defaults for Mainz examples.
                                    </Text>
                                    <Input data-testid="typecase-input" placeholder="Search docs" />
                                </Card.Body>

                                <Card.Footer>
                                    <Button data-testid="primary-action">Primary action</Button>
                                    <Button data-testid="ghost-action" variant="ghost">
                                        Ghost action
                                    </Button>
                                </Card.Footer>
                            </Card>

                            <CodeBlock>
                                <CodeBlock.Header>
                                    <CodeBlock.Language>tsx</CodeBlock.Language>
                                    <CodeBlock.Actions>
                                        <CopyIcon data-testid="copy-icon" size={16} />
                                    </CodeBlock.Actions>
                                </CodeBlock.Header>
                                <CodeBlock.Body>
                                    {`<Button variant="primary">Save</Button>`}
                                </CodeBlock.Body>
                            </CodeBlock>

                            <Toolbar data-testid="toolbar">
                                <Toolbar.Group>
                                    <Toolbar.Button
                                        active
                                        aria-label="Bold"
                                        data-testid="toolbar-bold"
                                    >
                                        B
                                    </Toolbar.Button>
                                    <Toolbar.Button aria-label="Italic">
                                        I
                                    </Toolbar.Button>
                                    <Toolbar.Button aria-label="Underline">
                                        U
                                    </Toolbar.Button>
                                </Toolbar.Group>
                                <Toolbar.Separator />
                                <Toolbar.Group>
                                    <Toolbar.Button aria-label="Turn into link">
                                        Link
                                    </Toolbar.Button>
                                </Toolbar.Group>
                            </Toolbar>

                            <Toolbar data-testid="toolbar-compact" size="sm">
                                <Toolbar.Group>
                                    <Toolbar.Button aria-label="Code">{"</>"}</Toolbar.Button>
                                    <Toolbar.Button aria-label="Comment">@</Toolbar.Button>
                                </Toolbar.Group>
                            </Toolbar>

                            <QuickMenu data-testid="quick-menu">
                                <QuickMenu.Header>
                                    <QuickMenu.Kicker>Insert</QuickMenu.Kicker>
                                    <QuickMenu.Title>Quick menu</QuickMenu.Title>
                                </QuickMenu.Header>
                                <QuickMenu.List>
                                    <QuickMenu.Group>
                                        <QuickMenu.GroupLabel>Basic blocks</QuickMenu.GroupLabel>
                                        <QuickMenu.Item
                                            active
                                            data-testid="quick-menu-item"
                                            description="Start writing with a simple paragraph."
                                            icon="P"
                                            shortcut="Enter"
                                        >
                                            Paragraph
                                        </QuickMenu.Item>
                                        <QuickMenu.Item
                                            description="Create a highlighted callout section."
                                            icon="!"
                                            trailing={<Badge tone="primary">New</Badge>}
                                        >
                                            Callout
                                        </QuickMenu.Item>
                                    </QuickMenu.Group>
                                </QuickMenu.List>
                            </QuickMenu>

                            <QuickMenu data-testid="quick-menu-compact" size="sm">
                                <QuickMenu.List>
                                    <QuickMenu.Group>
                                        <QuickMenu.Item
                                            data-testid="quick-menu-compact-item"
                                            icon="[]"
                                            shortcut="Enter"
                                        >
                                            Callout
                                        </QuickMenu.Item>
                                        <QuickMenu.Item icon="{}" trailing="...">
                                            Code
                                        </QuickMenu.Item>
                                    </QuickMenu.Group>
                                </QuickMenu.List>
                            </QuickMenu>

                            <Section data-testid="section" gap="md">
                                <Title as="h3" size="sm">Section heading</Title>
                                <Text tone="muted">
                                    Keeps page sections consistent without extra CSS.
                                </Text>
                            </Section>

                            <Cluster data-testid="cluster" gap="sm">
                                <Badge data-testid="badge" tone="success">Stable</Badge>
                                <Badge tone="primary" variant="outline">New</Badge>
                                <Button size="sm" variant="secondary">Tag A</Button>
                                <Button size="sm" variant="ghost">Tag B</Button>
                            </Cluster>

                            <Inline data-testid="feedback-row" gap="md">
                                <Spinner data-testid="spinner" size="sm" />
                                <Skeleton
                                    data-testid="skeleton"
                                    variant="text"
                                    width="10rem"
                                />
                            </Inline>

                            <Stack data-testid="progress-stack" gap="sm">
                                <Progress
                                    data-testid="progress"
                                    label="Documentation coverage"
                                    value={64}
                                />
                                <Progress data-testid="progress-indeterminate" label="Loading" />
                            </Stack>

                            <Inline data-testid="kbd-row" gap="sm">
                                <Kbd data-testid="kbd">Enter</Kbd>
                                <Text tone="muted">Submit the form</Text>
                            </Inline>

                            <Inline data-testid="shortcut-row" gap="sm">
                                <Shortcut data-testid="shortcut" chord="Mod+K" />
                                <Text tone="muted">Open command palette</Text>
                            </Inline>

                            <Figure data-testid="figure">
                                <Image
                                    alt="Soft blue illustration"
                                    aspectRatio="16 / 9"
                                    data-testid="image"
                                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23dbeafe'/%3E%3Ccircle cx='240' cy='78' r='54' fill='%2393c5fd'/%3E%3C/svg%3E"
                                />
                                <Figure.Caption>Media with supporting caption.</Figure.Caption>
                            </Figure>

                            <Inline data-testid="avatar-row" gap="sm">
                                <Avatar data-testid="avatar" alt="Ada Lovelace">AL</Avatar>
                                <Avatar
                                    data-testid="avatar-image"
                                    alt="Typecase"
                                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%230f172a'/%3E%3Ctext x='40' y='48' text-anchor='middle' font-size='28' fill='white'%3ET%3C/text%3E%3C/svg%3E"
                                />
                            </Inline>

                            <Inline data-testid="switch-row" gap="md">
                                <Switch data-testid="switch" defaultChecked>
                                    Enable preview mode
                                </Switch>
                                <Switch data-testid="switch-sm" size="sm">
                                    Compact
                                </Switch>
                            </Inline>

                            <EmptyState data-testid="empty-state" variant="subtle">
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

                            <Callout data-testid="callout" tone="info">
                                <Callout.Title>Helpful context</Callout.Title>
                                <Callout.Body>
                                    <Text tone="muted">
                                        Callouts group supporting notes without introducing local
                                        CSS.
                                    </Text>
                                </Callout.Body>
                            </Callout>

                            <Alert data-testid="alert" tone="success">
                                <Alert.Icon>
                                    <StatusDot data-testid="status-dot" pulse tone="success" />
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

                            <Toast data-testid="toast" tone="info">
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

                            <Steps data-testid="steps" label="Publish flow">
                                <Steps.Item status="complete">
                                    <Steps.Indicator>1</Steps.Indicator>
                                    <Steps.Content>
                                        <Steps.Title>Define</Steps.Title>
                                        <Steps.Description>
                                            Document the component API.
                                        </Steps.Description>
                                    </Steps.Content>
                                </Steps.Item>
                                <Steps.Item status="current">
                                    <Steps.Indicator>2</Steps.Indicator>
                                    <Steps.Content>
                                        <Steps.Title>Preview</Steps.Title>
                                        <Steps.Description>
                                            Check the rendered example.
                                        </Steps.Description>
                                    </Steps.Content>
                                </Steps.Item>
                                <Steps.Item>
                                    <Steps.Indicator>3</Steps.Indicator>
                                    <Steps.Content>
                                        <Steps.Title>Ship</Steps.Title>
                                        <Steps.Description>
                                            Publish the docs page.
                                        </Steps.Description>
                                    </Steps.Content>
                                </Steps.Item>
                            </Steps>

                            <LinkBox data-testid="link-box" variant="subtle">
                                <LinkBox.Meta>
                                    <Badge tone="primary" variant="outline">Guide</Badge>
                                </LinkBox.Meta>
                                <LinkBox.Link href="/components/card">
                                    Composable cards
                                </LinkBox.Link>
                                <LinkBox.Body>
                                    <Text tone="muted">
                                        Build a clickable summary while keeping nested controls
                                        possible.
                                    </Text>
                                </LinkBox.Body>
                            </LinkBox>

                            <DescriptionList
                                data-testid="description-list"
                                layout="inline"
                                variant="bordered"
                            >
                                <DescriptionList.Item>
                                    <DescriptionList.Term>Package</DescriptionList.Term>
                                    <DescriptionList.Details>
                                        mainz/typecase
                                    </DescriptionList.Details>
                                </DescriptionList.Item>
                                <DescriptionList.Item>
                                    <DescriptionList.Term>Layer</DescriptionList.Term>
                                    <DescriptionList.Details>Composite</DescriptionList.Details>
                                </DescriptionList.Item>
                            </DescriptionList>

                            <Grid columns={3} gap="md">
                                <Stat data-testid="stat" variant="subtle">
                                    <Stat.Label>Components</Stat.Label>
                                    <Stat.Value>42</Stat.Value>
                                    <Stat.HelpText>documented examples</Stat.HelpText>
                                </Stat>
                            </Grid>

                            <Breadcrumb data-testid="breadcrumb">
                                <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
                                <Breadcrumb.Item href="/components">Components</Breadcrumb.Item>
                                <Breadcrumb.Item active>Tabs</Breadcrumb.Item>
                            </Breadcrumb>

                            <Pagination data-testid="pagination" label="Component pages">
                                <Pagination.Item disabled label="Previous page">
                                    Previous
                                </Pagination.Item>
                                <Pagination.Item active href="?page=1" label="Page 1">
                                    1
                                </Pagination.Item>
                                <Pagination.Item href="?page=2" label="Page 2">2</Pagination.Item>
                                <Pagination.Ellipsis />
                                <Pagination.Item href="?page=8" label="Page 8">8</Pagination.Item>
                                <Pagination.Item href="?page=2" label="Next page">
                                    Next
                                </Pagination.Item>
                            </Pagination>

                            <Tabs data-testid="tabs" variant="line">
                                <Tabs.List label="Component sections">
                                    <Tabs.Tab
                                        active
                                        controls="tabs-overview"
                                        id="tabs-overview-tab"
                                    >
                                        Overview
                                    </Tabs.Tab>
                                    <Tabs.Tab controls="tabs-api" id="tabs-api-tab">
                                        API
                                    </Tabs.Tab>
                                </Tabs.List>
                                <Tabs.Panel labelledBy="tabs-overview-tab" id="tabs-overview">
                                    <Text tone="muted">Active tab panel content.</Text>
                                </Tabs.Panel>
                                <Tabs.Panel
                                    active={false}
                                    labelledBy="tabs-api-tab"
                                    id="tabs-api"
                                >
                                    <Text tone="muted">Inactive tab panel content.</Text>
                                </Tabs.Panel>
                            </Tabs>

                            <Accordion data-testid="accordion">
                                <Accordion.Item open>
                                    <Accordion.Trigger>
                                        What belongs in a primitive?
                                    </Accordion.Trigger>
                                    <Accordion.Panel>
                                        <Text tone="muted">
                                            Small, reusable controls and typography without a full
                                            use-case baked in.
                                        </Text>
                                    </Accordion.Panel>
                                </Accordion.Item>
                                <Accordion.Item>
                                    <Accordion.Trigger>Why use a composite?</Accordion.Trigger>
                                    <Accordion.Panel>
                                        <Text tone="muted">
                                            Composites keep structure open while leaving state and
                                            behavior to the caller.
                                        </Text>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>

                            <Table data-testid="table" striped>
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
                                        <Table.Cell>Stable</Table.Cell>
                                        <Table.Cell align="end">4</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell>Table</Table.Cell>
                                        <Table.Cell>New</Table.Cell>
                                        <Table.Cell align="end">1</Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table>

                            <Field data-testid="field" invalid>
                                <Field.Label for="field-description" required>
                                    Description
                                </Field.Label>
                                <Field.Control>
                                    <Textarea
                                        data-testid="textarea"
                                        id="field-description"
                                        invalid
                                        placeholder="Write a short description"
                                    />
                                </Field.Control>
                                <Field.Hint>Keep it short and concrete.</Field.Hint>
                                <Field.Error>Description is required.</Field.Error>
                            </Field>

                            <Field data-testid="select-field">
                                <Label for="field-status" required>Status</Label>
                                <Select data-testid="select" id="field-status" value="draft">
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </Select>
                            </Field>

                            <Fieldset data-testid="fieldset">
                                <Fieldset.Legend>Preferences</Fieldset.Legend>
                                <Fieldset.Hint>Choose how the example should behave.</Fieldset.Hint>
                                <Fieldset.Body>
                                    <Checkbox data-testid="checkbox" defaultChecked name="compact">
                                        Compact layout
                                    </Checkbox>
                                    <Radio
                                        data-testid="radio"
                                        defaultChecked
                                        name="mode"
                                        value="auto"
                                    >
                                        Automatic mode
                                    </Radio>
                                </Fieldset.Body>
                            </Fieldset>

                            <Center
                                data-testid="center"
                                axis="both"
                                maxWidth="md"
                                minHeight="7rem"
                                style="border: 1px dashed var(--tc-color-border);"
                            >
                                <Text>Centered state</Text>
                            </Center>

                            <Inline data-testid="inline-with-spacer" wrap={false}>
                                <Text>Leading</Text>
                                <Spacer data-testid="spacer" />
                                <Text>Trailing</Text>
                            </Inline>

                            <Inset
                                data-testid="inset"
                                padding="sm"
                                paddingX="lg"
                                style="background: var(--tc-color-surface-subtle);"
                            >
                                <Text>Inset content</Text>
                            </Inset>

                            <Navbar data-testid="navbar" gap="lg">
                                <Navbar.Start>
                                    <Button size="sm" variant="ghost">Toggle</Button>
                                </Navbar.Start>
                                <Navbar.Brand>
                                    <Anchor href="/">Typecase</Anchor>
                                </Navbar.Brand>
                                <Navbar.Nav>
                                    <Anchor href="/components/button">Button</Anchor>
                                </Navbar.Nav>
                                <Navbar.Actions>
                                    <Button size="sm" variant="ghost">Menu</Button>
                                </Navbar.Actions>
                            </Navbar>

                            <Snippet language="ts">{`const greeting = "hello";`}</Snippet>

                            <SearchPalette
                                data-testid="search-palette"
                                items={[
                                    {
                                        href: "/components/button",
                                        section: "Primitives",
                                        summary: "Primary action primitive.",
                                        title: "Button",
                                    },
                                ]}
                                shortcut="Mod+K"
                            />
                            <CommandLauncher
                                data-testid="command-launcher"
                                shortcut="Mod+Shift+P"
                            />
                            <Text data-testid="command-run-count">
                                {String(this.state.commandRuns)}
                            </Text>

                            <DropdownMenu data-testid="dropdown-menu" align="start">
                                <DropdownMenu.Trigger>
                                    <Button
                                        data-testid="dropdown-menu-trigger"
                                        size="sm"
                                        variant="secondary"
                                    >
                                        Open menu
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                    <DropdownMenu.Item
                                        active
                                        shortcut="Mod+K"
                                        value="search"
                                    >
                                        Search
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item value="help">Help</DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu>

                            <OnThisPage
                                data-testid="on-this-page"
                                items={[
                                    { id: "overview", label: "Overview" },
                                    {
                                        id: "usage",
                                        items: [
                                            { id: "brand", label: "Brand" },
                                            { id: "actions", label: "Actions" },
                                        ],
                                        label: "Usage",
                                    },
                                ]}
                                maxHeight="12rem"
                            />

                            <Offcanvas data-testid="offcanvas" mode="inline" open width="20rem">
                                <Offcanvas.Header>
                                    <Offcanvas.Title>Browse components</Offcanvas.Title>
                                    <Button data-testid="close-nav" size="sm" variant="ghost">
                                        Close
                                    </Button>
                                </Offcanvas.Header>
                                <Offcanvas.Body>
                                    <List data-testid="sidebar-list" variant="nav">
                                        <List.Item active href="/components/button">
                                            Button
                                        </List.Item>
                                        <List.Item href="/components/card">Card</List.Item>
                                    </List>
                                </Offcanvas.Body>
                            </Offcanvas>

                            <Popover
                                align="start"
                                data-testid="popover"
                                open
                                placement="bottom"
                            >
                                <Popover.Anchor>
                                    <Button size="sm" variant="secondary">Static popover</Button>
                                </Popover.Anchor>
                                <Popover.Content>
                                    <Text tone="muted">Composite popover content.</Text>
                                </Popover.Content>
                            </Popover>

                            <Dialog data-testid="dialog" open showBackdrop={false}>
                                <Dialog.Panel label="Example dialog" size="sm">
                                    <Dialog.Header>
                                        <Dialog.Title>Dialog title</Dialog.Title>
                                    </Dialog.Header>
                                    <Dialog.Body>
                                        <Text tone="muted">Composite dialog content.</Text>
                                    </Dialog.Body>
                                </Dialog.Panel>
                            </Dialog>

                            <PopoverTrigger align="start" data-testid="popover-trigger">
                                <PopoverTrigger.Anchor>
                                    <Button
                                        data-testid="popover-trigger-button"
                                        size="sm"
                                        variant="secondary"
                                    >
                                        Open popover
                                    </Button>
                                </PopoverTrigger.Anchor>
                                <PopoverTrigger.Content>
                                    <Text tone="muted">Portaled popover content.</Text>
                                </PopoverTrigger.Content>
                            </PopoverTrigger>

                            <Tooltip
                                closeDelay={0}
                                content="Tooltip detail"
                                openDelay={0}
                                placement="bottom"
                            >
                                <Button data-testid="tooltip-trigger" size="sm" variant="ghost">
                                    Hover help
                                </Button>
                            </Tooltip>

                            <Modal
                                label="Fixture modal"
                                trigger={
                                    <Button
                                        data-testid="modal-trigger"
                                        size="sm"
                                        variant="secondary"
                                    >
                                        Open modal
                                    </Button>
                                }
                            >
                                <Modal.Header>
                                    <Modal.Title>Modal dialog</Modal.Title>
                                    <Modal.Close size="sm">Close</Modal.Close>
                                </Modal.Header>
                                <Modal.Body>
                                    <Text tone="muted">Portaled modal content.</Text>
                                </Modal.Body>
                            </Modal>

                            <Drawer
                                data-testid="drawer"
                                trigger={
                                    <Button
                                        data-testid="drawer-trigger"
                                        size="sm"
                                        variant="secondary"
                                    >
                                        Open drawer
                                    </Button>
                                }
                                width="18rem"
                            >
                                <Drawer.Header>
                                    <Drawer.Title>Drawer menu</Drawer.Title>
                                    <Drawer.Close size="sm">Close</Drawer.Close>
                                </Drawer.Header>
                                <Drawer.Body>
                                    <Text tone="muted">Portaled drawer content.</Text>
                                </Drawer.Body>
                            </Drawer>

                            <Split
                                collapseBelow="md"
                                data-testid="split"
                                endWidth="10rem"
                                gap="lg"
                                startWidth="12rem"
                            >
                                <Split.Start sticky top="1.5rem">
                                    <ScrollArea
                                        data-testid="scroll-area"
                                        maxHeight="12rem"
                                        style="padding-right: 0.5rem;"
                                    >
                                        <List variant="nav">
                                            <List.Item active href="/components/split">
                                                Split
                                            </List.Item>
                                            <List.Item href="/components/scroll-area">
                                                ScrollArea
                                            </List.Item>
                                        </List>
                                    </ScrollArea>
                                </Split.Start>
                                <Split.Main>
                                    <Text>Document flow stays in the main region.</Text>
                                </Split.Main>
                                <Split.End>
                                    <Text tone="muted">Rail</Text>
                                </Split.End>
                            </Split>

                            <Show below="md" data-testid="show-below">
                                <Button size="sm" variant="ghost">Mobile only</Button>
                            </Show>

                            <Show above="md" data-testid="show-above">
                                <Text>Desktop and up</Text>
                            </Show>

                            <Show between={["sm", "md"]} data-testid="show-between">
                                <Text>Tablet band</Text>
                            </Show>

                            <Heading3Icon data-testid="heading3-icon" size={20} />

                            <TypecaseRoot
                                data-testid="nested-theme-root"
                                defaultPreference="dark"
                                storageKey={false}
                                themes={[lightTheme, darkTheme]}
                            >
                                <ThemeSwitch data-testid="nested-theme-switch" />
                            </TypecaseRoot>
                        </div>
                    </Screen>
                </TypecaseRoot>

                <TypecaseRoot data-testid="dark-preview-root" theme={darkTheme}>
                    <Container maxWidth="lg">
                        <Stack gap="lg">
                            <Title data-testid="dark-preview-title" size="lg">
                                Dark theme preview
                            </Title>
                            <Text as="p">
                                This preview validates the public dark theme instead of a site-local
                                theme.
                            </Text>
                            <Anchor data-testid="dark-preview-link" href="/news">
                                Read the docs
                            </Anchor>
                            <Divider />
                            <Grid columns={1}>
                                <MetaTable
                                    items={[
                                        { label: "Mode", value: "Dark" },
                                        { label: "Category", value: "Theme" },
                                    ]}
                                />
                            </Grid>
                        </Stack>
                    </Container>
                </TypecaseRoot>

                <TypecaseRoot
                    data-testid="dark-root"
                    defaultPreference="dark"
                    storageKey={false}
                    themes={[lightTheme, darkTheme]}
                >
                    <Inline gap="md">
                        <ThemeSwitch data-testid="theme-switch" />
                        <SunIcon data-testid="sun-icon" size={16} />
                        <ChevronDownIcon data-testid="chevron-down-icon" size={14} />
                    </Inline>
                </TypecaseRoot>

                <TypecaseRoot
                    data-testid="scoped-outer-root"
                    defaultPreference="dark"
                    storageKey={false}
                    themes={[lightTheme, darkTheme]}
                >
                    <Stack gap="sm">
                        <Text>Outer theme scope</Text>
                        <TypecaseRoot
                            data-testid="scoped-inner-root"
                            defaultPreference="dark"
                            storageKey={false}
                            themes={[lightTheme, darkTheme]}
                        >
                            <ThemeSwitch data-testid="scoped-inner-switch" />
                        </TypecaseRoot>
                    </Stack>
                </TypecaseRoot>
            </div>
        );
    }
}
