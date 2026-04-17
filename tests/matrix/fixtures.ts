/// <reference lib="deno.ns" />

import {
    buildBasePathAppForCombination,
    buildDocumentLanguageRoutedAppForCombination,
    buildGeneratedTagStabilityAppForCombination,
    buildHeadSeoAppForCombination,
    buildNavigationOverrideAppForCombination,
    buildRootAppForCombination,
    buildRoutedAppForCombination,
    buildRoutedAuthorizationAppForCombination,
    buildRoutedDiEntriesAppForCombination,
    buildRoutedDiClientAppForCombination,
    buildSingleLocaleRoutedAppForCombination,
} from "../helpers/build.ts";
import type { TestBuildCombination, TestBuildContext } from "../helpers/types.ts";
import {
    loadBuiltDocument,
    previewBuiltRoute,
    readBuiltJsonFile,
    readBuiltRouteHtml,
    renderBuiltDocument,
    renderBuiltRoute,
    resolveBuiltRouteHtmlPath,
    type ResolvedFixture,
} from "./render-fixture.ts";
import type { MatrixArtifact, MatrixBuildRecipe } from "./harness.ts";

export type FixtureId =
    | "RoutedApp"
    | "RootApp"
    | "RoutedDIEntriesApp"
    | "RoutedDIClientApp"
    | "RoutedAuthorizationApp"
    | "SingleLocaleRoutedApp"
    | "DocumentLanguageRoutedApp"
    | "BasePathApp"
    | "HeadSeoApp"
    | "NavigationOverrideApp"
    | "GeneratedTagStabilityApp";

type MatrixFixtureDefinition = {
    id: FixtureId;
    build(recipe: MatrixBuildRecipe): Promise<MatrixArtifact>;
    resolve(): ResolvedFixture;
};

export const fixtures: Record<FixtureId, MatrixFixtureDefinition> = {
    "RoutedApp": {
        id: "RoutedApp",
        async build(recipe) {
            const context = await buildRoutedAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("RoutedApp");
        },
    },
    "RootApp": {
        id: "RootApp",
        async build(recipe) {
            const context = await buildRootAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("RootApp");
        },
    },
    "RoutedDIEntriesApp": {
        id: "RoutedDIEntriesApp",
        async build(recipe) {
            const context = await buildRoutedDiEntriesAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("RoutedDIEntriesApp");
        },
    },
    "RoutedDIClientApp": {
        id: "RoutedDIClientApp",
        async build(recipe) {
            const context = await buildRoutedDiClientAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("RoutedDIClientApp");
        },
    },
    "RoutedAuthorizationApp": {
        id: "RoutedAuthorizationApp",
        async build(recipe) {
            const context = await buildRoutedAuthorizationAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("RoutedAuthorizationApp");
        },
    },
    "SingleLocaleRoutedApp": {
        id: "SingleLocaleRoutedApp",
        async build(recipe) {
            const context = await buildSingleLocaleRoutedAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("SingleLocaleRoutedApp");
        },
    },
    "DocumentLanguageRoutedApp": {
        id: "DocumentLanguageRoutedApp",
        async build(recipe) {
            const context = await buildDocumentLanguageRoutedAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("DocumentLanguageRoutedApp");
        },
    },
    "BasePathApp": {
        id: "BasePathApp",
        async build(recipe) {
            const context = await buildBasePathAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("BasePathApp");
        },
    },
    "HeadSeoApp": {
        id: "HeadSeoApp",
        async build(recipe) {
            const context = await buildHeadSeoAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("HeadSeoApp");
        },
    },
    "NavigationOverrideApp": {
        id: "NavigationOverrideApp",
        async build(recipe) {
            const context = await buildNavigationOverrideAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("NavigationOverrideApp");
        },
    },
    "GeneratedTagStabilityApp": {
        id: "GeneratedTagStabilityApp",
        async build(recipe) {
            const context = await buildGeneratedTagStabilityAppForCombination(
                {
                    mode: recipe.render,
                    navigation: recipe.navigation,
                } satisfies TestBuildCombination,
            );

            return createMatrixArtifact(recipe, context);
        },
        resolve() {
            return createResolvedFixture("GeneratedTagStabilityApp");
        },
    },
};

export function resolveFixtureDefinition(fixtureId: FixtureId): MatrixFixtureDefinition {
    const definition = fixtures[fixtureId];
    if (!definition) {
        throw new Error(`Unknown matrix fixture "${fixtureId}".`);
    }

    return definition;
}

function createMatrixArtifact(
    recipe: MatrixBuildRecipe,
    context: TestBuildContext,
): MatrixArtifact {
    return {
        recipe,
        context,
        cleanup: context.cleanup,
    };
}

function createResolvedFixture(id: FixtureId): ResolvedFixture {
    return {
        id,
        readHtml: readBuiltRouteHtml,
        readJson: readBuiltJsonFile,
        loadDocument: loadBuiltDocument,
        resolveHtmlPath: resolveBuiltRouteHtmlPath,
        preview: previewBuiltRoute,
        renderDocument: renderBuiltDocument,
        render: renderBuiltRoute,
    };
}
