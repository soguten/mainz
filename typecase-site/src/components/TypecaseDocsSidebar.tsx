import { List, Stack, Text } from "mainz/typecase";
import { buildTypecaseDocHref } from "../lib/links.ts";
import { listTypecaseDocNavSections } from "../lib/typecase-docs.tsx";

export interface TypecaseDocsSidebarProps {
    activeSlug?: string;
}

export function TypecaseDocsSidebar(props: TypecaseDocsSidebarProps) {
    const sections = listTypecaseDocNavSections();

    return (
        <Stack gap="lg">
            <Stack className="typecase-docs-sidebar-intro" gap="sm">
                <Text as="span" weight="semibold">Components</Text>
                <Text as="p" tone="muted">
                    Browse the Typecase catalog by layer and open each component page directly.
                </Text>
            </Stack>

            <Stack gap="sm">
                <Text
                    as="span"
                    className="typecase-docs-sidebar-nav-title"
                    tone="muted"
                    weight="semibold"
                >
                    Overview
                </Text>
                <List variant="nav">
                    <List.Item active={!props.activeSlug} href="/">
                        Getting started
                    </List.Item>
                </List>
            </Stack>

            {sections.map((section) => (
                <Stack gap="sm">
                    <Text
                        as="span"
                        className="typecase-docs-sidebar-nav-title"
                        tone="muted"
                        weight="semibold"
                    >
                        {section.title}
                    </Text>
                    <List variant="nav">
                        {section.items.map((item) => (
                            <List.Item
                                active={item.slug === props.activeSlug}
                                href={buildTypecaseDocHref(item.slug)}
                            >
                                {item.title}
                            </List.Item>
                        ))}
                    </List>
                </Stack>
            ))}
        </Stack>
    );
}
