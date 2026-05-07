import {
  CustomElement,
  Page,
  type PageLoadContext,
  RenderMode,
  Route,
} from "mainz";

abstract class DiagnosticsRouteFixturePage extends Page {
  override render() {
    return <div></div>;
  }
}

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
const invalidReferencedEntries = () => [{
  params: invalidSharedParams,
}];
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
export class DynamicSsgWithoutEntriesPage extends DiagnosticsRouteFixturePage {}

@CustomElement("x-mainz-diagnostics-cli-missing-load-page")
@Route("/guides/:slug")
@RenderMode("ssg")
export class DynamicSsgWithoutLoadPage extends DiagnosticsRouteFixturePage {
  static entries() {
    return [{ params: { slug: "intro" } }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-legacy-static-load-page")
@Route("/legacy")
export class LegacyStaticLoadPage extends DiagnosticsRouteFixturePage {
  static load(_context: PageLoadContext) {
    return {
      title: "legacy",
    };
  }
}

@CustomElement("x-mainz-diagnostics-cli-mixed-load-page")
@Route("/mixed")
export class MixedLoadPage extends DiagnosticsRouteFixturePage {
  static load(_context: PageLoadContext) {
    return {
      title: "legacy",
    };
  }

  override load() {
    return {
      title: "instance",
    };
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-helper-page")
@Route("/tips/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesHelperPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return invalidHelperItems.map((item) => {
      const alias = item.wrong;
      const slug = `${alias}-draft`;
      return {
        params: {
          wrong: slug,
        },
      };
    });
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-async-helper-page")
@Route("/async/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntriesFromAsyncHelperPage
  extends DiagnosticsRouteFixturePage {
  static async entries() {
    const items = await invalidAsyncLoader();
    return items.map((item) => invalidAsyncMapper(item));
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-shared-params-page")
@Route("/shared/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSharedParamsPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return [{
      params: invalidSharedParams,
    }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-params-helper-page")
@Route("/helper/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidParamsHelperPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return [{
      params: invalidHelperParams("post"),
    }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-nested-params-helper-page")
@Route("/nested/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidNestedParamsHelperPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return [{
      params: wrapInvalidParams("post"),
    }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-entry-helper-page")
@Route("/entry-helper/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidEntryHelperPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return [invalidEntryFromSharedParams()];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-spread-params-page")
@Route("/spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSpreadParamsPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return [{
      params: {
        ...invalidSharedParams,
        category: "post",
      },
    }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-shared-spread-params-page")
@Route("/shared-spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidSharedSpreadParamsPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    return [{
      params: invalidMergedSharedParams,
    }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-local-spread-alias-page")
@Route("/local-spread/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidLocalSpreadAliasPage
  extends DiagnosticsRouteFixturePage {
  static entries() {
    const params = {
      ...invalidSharedParams,
      category: "post",
    };
    return [{ params }];
  }
}

@CustomElement("x-mainz-diagnostics-cli-invalid-referenced-entries-page")
@Route("/entries-ref/:slug")
@RenderMode("ssg")
export class DynamicSsgInvalidReferencedEntriesPage
  extends DiagnosticsRouteFixturePage {
  static entries = invalidReferencedEntries as never;
}
