import type {
    ConceptCardData,
    NextStepCardData,
    StageData,
} from "../components/types.ts";

export interface SiteDictionary {
    anchors: {
        top: string;
        hero: string;
        journey: string;
        concepts: string;
        sandbox: string;
        checkpoint: string;
        nextSteps: string;
    };
    nav: {
        brand: string;
        ariaLabel: string;
        home: string;
        journey: string;
        concepts: string;
        checkpoint: string;
        workshop: string;
    };
    common: {
        backToTop: string;
    };
    hero: {
        eyebrow: string;
        title: string;
        lead: string;
        tutorialCta: string;
        workshopCta: string;
    };
    journey: {
        eyebrow: string;
        title: string;
        progressSuffix: string;
        stages: StageData[];
        codeTitle: string;
        snippets: string[];
    };
    concepts: {
        eyebrow: string;
        title: string;
        cards: ConceptCardData[];
    };
    checkpoint: {
        eyebrow: string;
        title: string;
        description: string;
        progressLabel: string;
        submit: string;
        next: string;
        finish: string;
        retry: string;
        items: Array<{
            question: string;
            options: string[];
            correctIndex: number;
            success: string;
            failure: string;
        }>;
    };
    sandbox: {
        eyebrow: string;
        title: string;
        description: string;
        challengeLabel: string;
        editorLabel: string;
        validate: string;
        next: string;
        restart: string;
        successPrefix: string;
        failPrefix: string;
        finalTitle: string;
        finalDescription: string;
        challenges: Array<{
            title: string;
            instruction: string;
            starter: string;
            success: string;
            hint: string;
        }>;
        finalCode: string;
    };
    nextSteps: {
        eyebrow: string;
        title: string;
        cards: NextStepCardData[];
    };
    footer: {
        note: string;
        sourceLabel: string;
    };
}
