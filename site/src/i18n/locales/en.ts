import type { SiteDictionary } from "../types.ts";

const en: SiteDictionary = {
    anchors: {
        top: "home",
        hero: "hero",
        journey: "journey",
        concepts: "concepts",
        sandbox: "workshop",
        checkpoint: "checkpoint",
        nextSteps: "next-steps",
    },
    nav: {
        brand: "mainz",
        ariaLabel: "Main navigation",
        home: "Home",
        journey: "Journey",
        concepts: "Concepts",
        checkpoint: "Checkpoint",
        workshop: "Workshop",
    },
    common: {
        backToTop: "Back to top",
    },
    hero: {
        eyebrow: "Mainz, 1450",
        title: "mainz: a component tutorial inspired by Gutenberg's press",
        lead: "This page is a guided introduction to the mainz framework. Each section introduces a concept and helps you progress with practical TSX examples.",
        tutorialCta: "Start guided journey",
        workshopCta: "Open workshop",
    },
    journey: {
        eyebrow: "Guided journey",
        title: "Advance through the framework concepts",
        progressSuffix: "complete",
        stages: [
            {
                label: "Foundation",
                description: "Start by creating a class that extends Component and returns markup in render().",
            },
            {
                label: "State",
                description: "Use initState for initial values and setState for predictable updates.",
            },
            {
                label: "Events",
                description: "Connect buttons and inputs with onClick and onInput handlers.",
            },
            {
                label: "Composition",
                description: "Combine small components to build larger, clearer pages.",
            },
        ],
        codeTitle: "Code for this stage",
        snippets: [
            "import { Component } from \"mainz\";\n\n// Foundation: create your root component\nexport class HomePage extends Component {\n    override render() {\n        return (\n            <main>\n                <h1>mainz</h1>\n            </main>\n        );\n    }\n}",
            "interface HomeState {\n    count: number;\n}\n\n// State: initialize before first render\nprotected override initState(): HomeState {\n    return {\n        count: 0,\n    };\n}",
            "// Events: update state from interactions\nprivate increment = () => {\n    this.setState({\n        count: this.state.count + 1,\n    });\n};\n\noverride render() {\n    return (\n        <button type=\"button\" onClick={this.increment}>\n            {this.state.count}\n        </button>\n    );\n}",
            "// Composition: combine reusable building blocks\noverride render() {\n    return (\n        <main>\n            <HeroIntro />\n            <ConceptCard title=\"...\" description=\"...\" tag=\"BASE\" />\n            <InteractiveSandbox />\n        </main>\n    );\n}",
        ],
    },
    concepts: {
        eyebrow: "Core concepts",
        title: "Foundations for your first printed page",
        cards: [
            {
                title: "Component as matrix",
                description: "Each Component class works like a printing matrix: define the shape once and reuse it.",
                tag: "BASE",
            },
            {
                title: "State as live ink",
                description: "Each setState applies a new print while the DOM receives incremental patching.",
                tag: "STATE",
            },
            {
                title: "Workshop events",
                description: "TSX handlers keep interactions straightforward while preserving lifecycle control.",
                tag: "EVENT",
            },
            {
                title: "Composed sections",
                description: "Separating Hero, Cards, and Sandbox keeps the project scalable and maintainable.",
                tag: "ARCH",
            },
        ],
    },
    checkpoint: {
        eyebrow: "Checkpoint",
        title: "Quick understanding check",
        description: "Before moving on, validate one key idea from the framework.",
        progressLabel: "Question",
        submit: "Check answer",
        next: "Next question",
        finish: "Finish checkpoint",
        retry: "Try checkpoint again",
        items: [
            {
                question: "Which method should initialize state before first render?",
                options: [
                    "initState",
                    "onMount",
                    "constructor render hook",
                ],
                correctIndex: 0,
                success: "Correct. initState runs before first render and keeps bootstrap predictable.",
                failure: "Not this one yet. Try again focusing on state bootstrap lifecycle.",
            },
            {
                question: "What method should you call to update UI state reactively?",
                options: [
                    "setState",
                    "render",
                    "registerDOMEvent",
                ],
                correctIndex: 0,
                success: "Exactly. setState merges partial state and triggers a new render cycle.",
                failure: "Close. In mainz, UI updates should flow through setState.",
            },
            {
                question: "Which pattern keeps large pages maintainable in mainz?",
                options: [
                    "Compose small reusable components",
                    "Put all UI in one large render method",
                    "Avoid using props across sections",
                ],
                correctIndex: 0,
                success: "Great. Composition helps readability, reuse, and long-term evolution.",
                failure: "Not ideal. Prefer composition with focused components.",
            },
        ],
    },
    sandbox: {
        eyebrow: "Workshop",
        title: "Build your Todo component",
        description: "Complete challenges by writing code. A JavaScript validator checks your input and unlocks the next step.",
        challengeLabel: "Challenge",
        editorLabel: "Write your code",
        validate: "Check answer",
        next: "Next challenge",
        restart: "Restart workshop",
        successPrefix: "Passed",
        failPrefix: "Not yet",
        finalTitle: "Final component ready",
        finalDescription: "Great work. You completed all challenges and now have a full component to use.",
        challenges: [
            {
                title: "Challenge 1: Foundation",
                instruction: "Create `import { Component } from \"mainz\"` and a class named `Todo` extending `Component`.",
                starter:
                    "// Step 1\n// Create the Todo class structure\n",
                success: "Great. Todo class foundation is ready.",
                hint: "You need both: `import { Component } from \"mainz\"` and `class Todo extends Component`.",
            },
            {
                title: "Challenge 2: Initial state",
                instruction: "Inside class `Todo`, add `initState()` returning `{ draft: \"\", items: [] }`.",
                starter:
                    "import { Component } from \"mainz\";\n\nclass Todo extends Component {\n    // Step 2: add initState\n}\n",
                success: "Nice. Todo now has predictable initial state.",
                hint: "Add `initState()` and return an object with `draft` and `items`.",
            },
            {
                title: "Challenge 3: Event + render",
                instruction: "Still in `Todo`, add `handleDraftInput`, `addTodo`, and render input + button + list (`items.map(...)`).",
                starter:
                    "import { Component } from \"mainz\";\n\nclass Todo extends Component {\n    protected override initState() {\n        return {\n            draft: \"\",\n            items: [],\n        };\n    }\n\n    // Step 3: add handlers and render todo UI\n}\n",
                success: "Excellent. Todo behavior and rendering are complete.",
                hint: "Use `setState`, bind `onInput` and `onClick`, and render list with `this.state.items.map(...)`.",
            },
        ],
        finalCode:
            "import { Component } from \"mainz\";\n\ninterface TodoState {\n    draft: string;\n    items: string[];\n}\n\nexport class Todo extends Component<{}, TodoState> {\n    protected override initState(): TodoState {\n        return {\n            draft: \"\",\n            items: [],\n        };\n    }\n\n    private handleDraftInput = (event: Event) => {\n        const input = event.target as HTMLInputElement;\n        this.setState({\n            draft: input.value,\n        });\n    };\n\n    private addTodo = () => {\n        const nextItem = this.state.draft.trim();\n        if (!nextItem) return;\n\n        this.setState({\n            draft: \"\",\n            items: [...this.state.items, nextItem],\n        });\n    };\n\n    override render(): HTMLElement {\n        return (\n            <main>\n                <h2>Todo</h2>\n                <input\n                    type=\"text\"\n                    value={this.state.draft}\n                    onInput={this.handleDraftInput}\n                    placeholder=\"Write a task\"\n                />\n                <button type=\"button\" onClick={this.addTodo}>\n                    Add\n                </button>\n                <ul>\n                    {this.state.items.map((item, index) => (\n                        <li key={`${item}-${index}`}>{item}</li>\n                    ))}\n                </ul>\n            </main>\n        );\n    }\n}\n\nconst app = document.querySelector(\"#app\");\n\nif (!app) {\n    throw new Error(\"App container not found\");\n}\n\napp.append(<Todo />);",
    },
    nextSteps: {
        eyebrow: "Next steps",
        title: "After this page",
        cards: [
            {
                title: "1. Split into modules",
                description: "Move each component into its own file and keep the entrypoint focused.",
            },
            {
                title: "2. Add themed examples",
                description: "Create examples for lists, forms, and composition to expand the tutorial.",
            },
            {
                title: "3. Publish on GitHub Pages",
                description: "Run the site build and publish the output folder to keep the page updated.",
            },
        ],
    },
    footer: {
        note: "Open source code inspired by the printing tradition of Mainz.",
        sourceLabel: "View source on GitHub",
    },
};

export default en;
