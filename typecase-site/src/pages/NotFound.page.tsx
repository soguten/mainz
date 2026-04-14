import { Page, RenderMode, Route } from "mainz";
import { Button, Container, Stack, Text, Title, TypecaseRoot } from "mainz/typecase";

@Route("/404")
@RenderMode("ssg")
export class NotFoundPage extends Page {
    override head() {
        return {
            title: "Typecase | Not Found",
        };
    }

    override render() {
        return (
            <TypecaseRoot>
                <div style="min-height: 100vh; display: grid; place-items: center; background: #f8fafc;">
                    <Container maxWidth="md">
                        <Stack gap="lg">
                            <Text as="p" tone="muted" weight="semibold">Typecase</Text>
                            <Title as="h1" size="xl">Page not found</Title>
                            <Text as="p" tone="muted">
                                The documentation route you requested does not exist.
                            </Text>
                            <div>
                                <Button href="/">Back to the component docs</Button>
                            </div>
                        </Stack>
                    </Container>
                </div>
            </TypecaseRoot>
        );
    }
}
