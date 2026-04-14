import { Component } from "mainz";
import {
    Anchor,
    Button,
    CommandPaletteSearch,
    type CommandPaletteSearchItem,
    Container,
    darkTheme,
    Drawer,
    ListIcon,
    MainzIcon,
    Navbar,
    Screen,
    ScrollArea,
    Show,
    Split,
    ThemeSwitch,
    Topbar,
    TypecaseIcon,
    TypecaseRoot,
} from "mainz/typecase";
import { editorialTheme } from "../lib/editorial-theme.ts";
import { buildTypecaseDocHref } from "../lib/links.ts";
import { getTypecaseSectionTitle, listTypecaseDocs } from "../lib/typecase-docs.tsx";
import { TypecaseDocsSidebar } from "./TypecaseDocsSidebar.tsx";
import { typecaseDocsStyles } from "../styles/typecaseDocsStyles.ts";

interface TypecaseDocsFrameProps {
    activeSlug?: string;
    children?: unknown;
}

const TYPECASE_DOCS_SIDEBAR_SCROLL_KEY = "typecase-site:sidebar-scroll-top";

export class TypecaseDocsFrame extends Component<TypecaseDocsFrameProps> {
    static override styles = typecaseDocsStyles;

    private getSearchItems(): CommandPaletteSearchItem[] {
        return listTypecaseDocs().map((doc) => ({
            href: buildTypecaseDocHref(doc.slug),
            keywords: [doc.slug, doc.sectionId],
            section: getTypecaseSectionTitle(doc.sectionId),
            summary: doc.summary,
            title: doc.title,
        }));
    }

    private persistSidebarScroll = (event: Event): void => {
        if (typeof sessionStorage === "undefined") {
            return;
        }

        const currentTarget = event.currentTarget;
        if (!(currentTarget instanceof HTMLElement)) {
            return;
        }

        sessionStorage.setItem(
            TYPECASE_DOCS_SIDEBAR_SCROLL_KEY,
            String(currentTarget.scrollTop),
        );
    };

    override onMount(): void {
        this.syncSidebarScrollState();
    }

    override afterRender(): void {
        this.syncSidebarScrollState();
    }

    private syncSidebarScrollState(): void {
        const desktopSidebar = this.querySelector(".typecase-docs-sidebar-scroll");
        if (!(desktopSidebar instanceof HTMLElement)) {
            return;
        }

        this.registerDOMEvent(desktopSidebar, "scroll", this.persistSidebarScroll);

        if (typeof sessionStorage === "undefined") {
            return;
        }

        const storedScrollTop = Number(sessionStorage.getItem(TYPECASE_DOCS_SIDEBAR_SCROLL_KEY));
        if (!Number.isFinite(storedScrollTop) || storedScrollTop <= 0) {
            return;
        }

        desktopSidebar.scrollTop = storedScrollTop;
    }

    override render() {
        return (
            <TypecaseRoot
                defaultPreference="auto"
                storageKey="typecase-site:theme-preference"
                themes={[editorialTheme, darkTheme]}
            >
                <Screen>
                    <Topbar
                        blur
                        sticky
                        top="0"
                        variant="strong"
                        zIndex={30}
                    >
                        <Container maxWidth="full" padding="lg">
                            <Navbar minHeight="4rem">
                                <Navbar.Start>
                                    <Show below="md">
                                        <Drawer
                                            contentClassName="typecase-docs-sidebar-mobile"
                                            trigger={
                                                <Button
                                                    className="typecase-docs-sidebar-toggle"
                                                    size="sm"
                                                    variant="ghost"
                                                >
                                                    <ListIcon aria-hidden="true" size={16} />
                                                </Button>
                                            }
                                            width="18rem"
                                        >
                                            <Drawer.Header>
                                                <Drawer.Title>Menu</Drawer.Title>
                                                <Drawer.Close
                                                    className="typecase-docs-sidebar-close"
                                                    size="sm"
                                                    variant="ghost"
                                                >
                                                    Close
                                                </Drawer.Close>
                                            </Drawer.Header>
                                            <Drawer.Body>
                                                <ScrollArea maxHeight="calc(100vh - 8rem)">
                                                    <TypecaseDocsSidebar
                                                        activeSlug={this.props.activeSlug}
                                                    />
                                                </ScrollArea>
                                            </Drawer.Body>
                                        </Drawer>
                                    </Show>
                                </Navbar.Start>
                                <Navbar.Brand>
                                    <Anchor href="/" style="font-weight: 600;">
                                        <MainzIcon size={28} aria-hidden="true" />
                                        Typecase
                                    </Anchor>
                                </Navbar.Brand>
                                <Navbar.Actions>
                                    <CommandPaletteSearch
                                        emptyLabel="No components found."
                                        items={this.getSearchItems()}
                                        placeholder="Search Typecase components..."
                                        searchLabel="Search documentation"
                                        shortcut="Mod+K"
                                        triggerLabel="Search docs..."
                                    />
                                    <ThemeSwitch />
                                </Navbar.Actions>
                            </Navbar>
                        </Container>
                    </Topbar>

                    <Container maxWidth="2xl" padding="lg">
                        <Split
                            className="typecase-docs-body"
                            collapseBelow="md"
                            gap="xl"
                            startWidth="16rem"
                            style="padding-block: 1.5rem 3rem;"
                        >
                            <Split.Start
                                as="aside"
                                className="typecase-docs-sidebar-desktop"
                                sticky
                                top="4.75rem"
                            >
                                <ScrollArea
                                    className="typecase-docs-sidebar-scroll"
                                    height="calc(100vh - 5.5rem)"
                                    style="padding-right: 0.5rem;"
                                >
                                    <TypecaseDocsSidebar activeSlug={this.props.activeSlug} />
                                </ScrollArea>
                            </Split.Start>

                            <Split.Main as="main" className="typecase-docs-main">
                                {this.props.children}
                            </Split.Main>
                        </Split>
                    </Container>
                </Screen>
            </TypecaseRoot>
        );
    }
}
