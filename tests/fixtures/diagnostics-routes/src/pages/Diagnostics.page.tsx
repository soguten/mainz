import { CustomElement, entries, Page, RenderMode, Route } from "mainz";

const invalidHelperItems = [{ wrong: "intro" }] as const;
const invalidAsyncItems = [{ wrong: "guide" }] as const;
const invalidSharedParams = { wrong: "shared" } as const;
const invalidMergedSharedParams = {
    ...invalidSharedParams,
    section: "overview",
} as const;
const invalidHelperParams = (value: string) => ({
    wrong: `${value}-helper`,
});
const wrapInvalidParams = (value: string) => invalidHelperParams(value);
const invalidEntryFromSharedParams = () => ({
    params: invalidSharedParams,
});
const invalidReferencedEntries = () =>
    entries.from([{ slug: "post" }], () => ({
        params: invalidSharedParams,
    }));
const invalidAsyncLoader = async () => invalidAsyncItems;
const invalidAsyncMapper = (item: (typeof invalidAsyncItems)[number]) => {
    const alias = item.wrong;
    const params = {
        wrong: `${alias}-async`,
    };
    return { params };
};

@CustomElement("x-mainz-diagnostics-cli-missing-entries-page")
@Route("/docs/:slug")
@RenderMode("ssg")
export class DynamicSsgWithoutEntriesPage extends Page {}

@CustomElement("x-mainz-diagnostics-cli-missing-load-page")
@Route("/guides/:slug")
@RenderMode("ssg")
export class DynamicSsgWithoutLoadPage extends Page {
    static entries = entries.from([{ slug: "intro" }], (item) => ({
        slug: item.slug,
    }));
}

@CustomElement("x-mainz-diagnostics-cli-invalid-helper-page")
@Route("/tips/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesHelperPage extends Page {
    static entries = entries.from(invalidHelperItems, (item) => {
        const alias = item.wrong;
        const slug = `${alias}-draft`;
        return {
            wrong: slug,
        };
    });
}

@CustomElement("x-mainz-diagnostics-cli-invalid-async-helper-page")
@Route("/async/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesFromAsyncHelperPage extends Page {
    static entries = entries.fromAsync(invalidAsyncLoader, invalidAsyncMapper);
}

@CustomElement("x-mainz-diagnostics-cli-invalid-shared-params-page")
@Route("/shared/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSharedParamsPage extends Page {
    static entries = entries.from([{ slug: "ignored" }], () => ({
        params: invalidSharedParams,
    }));
}

@CustomElement("x-mainz-diagnostics-cli-invalid-params-helper-page")
@Route("/helper/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidParamsHelperPage extends Page {
    static entries = entries.from([{ slug: "post" }], (item) => ({
        params: invalidHelperParams(item.slug),
    }));
}

@CustomElement("x-mainz-diagnostics-cli-invalid-nested-params-helper-page")
@Route("/nested/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidNestedParamsHelperPage extends Page {
    static entries = entries.from([{ slug: "post" }], (item) => ({
        params: wrapInvalidParams(item.slug),
    }));
}

@CustomElement("x-mainz-diagnostics-cli-invalid-entry-helper-page")
@Route("/entry-helper/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntryHelperPage extends Page {
    static entries = entries.from([{ slug: "post" }], () => invalidEntryFromSharedParams());
}

@CustomElement("x-mainz-diagnostics-cli-invalid-spread-params-page")
@Route("/spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSpreadParamsPage extends Page {
    static entries = entries.from([{ slug: "post" }], (item) => ({
        params: {
            ...invalidSharedParams,
            category: item.slug,
        },
    }));
}

@CustomElement("x-mainz-diagnostics-cli-invalid-shared-spread-params-page")
@Route("/shared-spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSharedSpreadParamsPage extends Page {
    static entries = entries.from([{ slug: "post" }], () => ({
        params: invalidMergedSharedParams,
    }));
}

@CustomElement("x-mainz-diagnostics-cli-invalid-local-spread-alias-page")
@Route("/local-spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidLocalSpreadAliasPage extends Page {
    static entries = entries.from([{ slug: "post" }], (item) => {
        const params = {
            ...invalidSharedParams,
            category: item.slug,
        };
        return { params };
    });
}

@CustomElement("x-mainz-diagnostics-cli-invalid-referenced-entries-page")
@Route("/entries-ref/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidReferencedEntriesPage extends Page {
    static entries = invalidReferencedEntries;
}
