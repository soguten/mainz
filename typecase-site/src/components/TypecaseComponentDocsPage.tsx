import {
    Divider,
    Grid,
    List,
    OnThisPage,
    Section,
    Split,
    Stack,
    Text,
    Title,
    Surface,
} from "mainz/typecase";
import { getTypecaseDocBySlug, getTypecaseSectionTitle } from "../lib/typecase-docs.tsx";
import { TypecaseDocsFrame } from "./TypecaseDocsFrame.tsx";
import { TypecaseDocsSnippet } from "./TypecaseDocsSnippet.tsx";

export interface TypecaseComponentDocsPageProps {
    slug: string;
}

export function TypecaseComponentDocsPage(props: TypecaseComponentDocsPageProps) {
    const doc = getTypecaseDocBySlug(props.slug);

    if (!doc) {
        return (
            <TypecaseDocsFrame activeSlug={props.slug}>
                <Stack gap="xl">
                    <div class="typecase-docs-hero">
                        <Text as="p" tone="muted" weight="semibold">
                            Typecase documentation
                        </Text>
                        <Title as="h1" size="xl">Component not found</Title>
                        <Text as="p" tone="muted" style="max-width: 68ch;">
                            The requested component page does not exist.
                        </Text>
                    </div>

                    <Surface padding="lg" variant="subtle">
                        <Text tone="muted">
                            Check the sidebar for an available component entry.
                        </Text>
                    </Surface>
                </Stack>
            </TypecaseDocsFrame>
        );
    }

    return (
        <TypecaseDocsFrame activeSlug={doc.slug}>
            <Split className="typecase-docs-section-grid" collapseBelow="md" endWidth="12rem" gap="xl">
                <Split.Main>
                    <Stack className="typecase-docs-content-flow" gap="xl">
                        <div class="typecase-docs-hero">
                            <Text as="p" tone="muted" weight="semibold">
                                {getTypecaseSectionTitle(doc.sectionId)}
                            </Text>
                            <Title as="h1" size="xl">{doc.title}</Title>
                            <Text as="p" tone="muted" style="max-width: 68ch;">
                                {doc.summary}
                            </Text>
                        </div>

                        <Section gap="md" id="preview">
                            <Text as="p" tone="muted" weight="semibold">Preview</Text>
                            {doc.renderPreview()}
                        </Section>

                        <Divider />

                        <Section gap="md" id="usage">
                            <Text as="p" tone="muted" weight="semibold">Usage</Text>
                            <TypecaseDocsSnippet code={doc.usage} language="tsx" />
                        </Section>

                        <Divider />

                        <Section gap="md" id="notes">
                            <Text as="p" tone="muted" weight="semibold">Notes</Text>
                            <List>
                                {doc.notes.map((note) => (
                                    <List.Item>{note}</List.Item>
                                ))}
                            </List>
                        </Section>
                    </Stack>
                </Split.Main>

                <Split.End as="aside" className="typecase-docs-aside" sticky top="4.75rem">
                    <Grid columns={1} gap="lg">
                        <OnThisPage
                            items={[
                                { id: "preview", label: "Preview" },
                                { id: "usage", label: "Usage" },
                                { id: "notes", label: "Notes" },
                            ]}
                            maxHeight="calc(100vh - 10rem)"
                        />

                    </Grid>
                </Split.End>
            </Split>
        </TypecaseDocsFrame>
    );
}
