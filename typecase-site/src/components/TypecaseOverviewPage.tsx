import { Anchor, Card, Grid, Stack, Surface, Text, Title } from "mainz/typecase";
import {
    countDocsInSection,
    getTypecaseSectionTitle,
    listTypecaseDocNavSections,
    renderOverviewEditorialPreview,
} from "../lib/typecase-docs.tsx";
import { buildTypecaseDocHref } from "../lib/links.ts";
import { TypecaseDocsFrame } from "./TypecaseDocsFrame.tsx";

export function TypecaseOverviewPage() {
    const sections = listTypecaseDocNavSections();

    return (
        <TypecaseDocsFrame>
            <Stack gap="xl">
                <div class="typecase-docs-hero">
                    <Text as="p" tone="muted" weight="semibold">
                        Typecase documentation
                    </Text>
                    <Title as="h1" size="xl">Documented components for Mainz apps</Title>
                    <Text as="p" tone="muted" style="max-width: 68ch;">
                        Typecase is the Mainz component catalog. It separates primitives,
                        composites, and patterns, and this site documents that public surface with
                        live examples.
                    </Text>
                </div>

                <Grid gap="lg" minItemWidth="15rem">
                    {sections.map((section) => (
                        <Card>
                            <Card.Header>
                                <Card.Title>{getTypecaseSectionTitle(section.id)}</Card.Title>
                                <Text tone="muted">{countDocsInSection(section.id)} items</Text>
                            </Card.Header>
                            <Card.Body>
                                <Text tone="muted">
                                    Browse the components in this section and see the contract in a
                                    calm, reusable baseline.
                                </Text>
                                <Anchor href={buildTypecaseDocHref(section.items[0].slug)}>
                                    Start with {section.items[0].title}
                                </Anchor>
                            </Card.Body>
                        </Card>
                    ))}
                </Grid>

                <Surface padding="lg" variant="subtle">
                    <Stack gap="lg">
                        <Title as="h2" size="lg">Documentation strategy</Title>
                        <Text tone="muted">
                            The sidebar itself is built with Typecase. It uses <code>Offcanvas</code>{" "}
                            for the responsive shell and <code>List</code> plus <code>List.Item</code>{" "}
                            for the navigation tree.
                        </Text>
                    </Stack>
                </Surface>

                {renderOverviewEditorialPreview()}
            </Stack>
        </TypecaseDocsFrame>
    );
}
