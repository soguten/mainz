import { CustomElement, entries, Page, RenderMode, Route } from "../../components/index.ts";

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

@CustomElement("x-mainz-diagnostics-dynamic-no-entries-page")
@Route("/docs/:slug")
@RenderMode("ssg")
export class DynamicSsgWithoutEntriesPage extends Page {}

@CustomElement("x-mainz-diagnostics-dynamic-no-load-page")
@Route("/guides/:slug")
@RenderMode("ssg")
export class DynamicSsgWithoutLoadPage extends Page {
    static entries = entries.from([{ slug: "intro" }], (item) => ({
        slug: item.slug,
    }));
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-entries-page")
@Route("/blog/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesPage extends Page {
    static async entries() {
        return [
            {
                params: { wrong: "intro" },
            },
        ];
    }
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-shape-page")
@Route("/news/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesShapePage extends Page {
    static async entries() {
        return {
            params: { slug: "intro" },
        } as never;
    }
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-helper-page")
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

@CustomElement("x-mainz-diagnostics-dynamic-invalid-async-helper-page")
@Route("/async/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesFromAsyncHelperPage extends Page {
    static entries = entries.fromAsync(invalidAsyncLoader, invalidAsyncMapper);
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-shared-params-page")
@Route("/shared/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSharedParamsPage extends Page {
    static entries = entries.from([{ slug: "ignored" }], () => ({
        params: invalidSharedParams,
    }));
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-params-helper-page")
@Route("/helper/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidParamsHelperPage extends Page {
    static entries = entries.from([{ slug: "post" }], (item) => ({
        params: invalidHelperParams(item.slug),
    }));
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-nested-params-helper-page")
@Route("/nested/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidNestedParamsHelperPage extends Page {
    static entries = entries.from([{ slug: "post" }], (item) => ({
        params: wrapInvalidParams(item.slug),
    }));
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-entry-helper-page")
@Route("/entry-helper/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntryHelperPage extends Page {
    static entries = entries.from([{ slug: "post" }], () => invalidEntryFromSharedParams());
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-spread-params-page")
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

@CustomElement("x-mainz-diagnostics-dynamic-invalid-shared-spread-params-page")
@Route("/shared-spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSharedSpreadParamsPage extends Page {
    static entries = entries.from([{ slug: "post" }], () => ({
        params: invalidMergedSharedParams,
    }));
}

@CustomElement("x-mainz-diagnostics-dynamic-invalid-local-spread-alias-page")
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

@CustomElement("x-mainz-diagnostics-dynamic-invalid-referenced-entries-page")
@Route("/entries-ref/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidReferencedEntriesPage extends Page {
    static entries = invalidReferencedEntries;
}

@CustomElement("x-mainz-diagnostics-static-page")
@Route("/about")
export class StaticSsgPage extends Page {}

@CustomElement("x-mainz-diagnostics-not-found-csr-page")
@Route("/missing")
@RenderMode("csr")
export class InvalidNotFoundCsrPage extends Page {
    static override page = {
        notFound: true,
    };
}

@CustomElement("x-mainz-diagnostics-not-found-ssg-page")
@Route("/404")
@RenderMode("ssg")
export class FirstNotFoundPage extends Page {
    static override page = {
        notFound: true,
    };
}
