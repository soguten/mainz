import type { SiteDictionary } from "../types.ts";

const pt: SiteDictionary = {
    localeNames: {
        en: "Ingles",
        pt: "Portugues",
    },
    anchors: {
        top: "inicio",
        hero: "hero",
        journey: "trilha",
        concepts: "conceitos",
        sandbox: "oficina",
        checkpoint: "checkpoint",
        nextSteps: "proximos",
    },
    nav: {
        brand: "mainz",
        ariaLabel: "Navegacao principal",
        languageLabel: "Idioma",
        languageMenuLabel: "Seletor de idioma",
        home: "Inicio",
        journey: "Trilha",
        concepts: "Conceitos",
        checkpoint: "Checkpoint",
        workshop: "Oficina",
    },
    common: {
        backToTop: "Voltar ao inicio",
    },
    hero: {
        eyebrow: "Mainz, 1450",
        title: "mainz: tutorial de componentes inspirado na imprensa de Gutenberg",
        lead: "Esta pagina e uma introducao guiada ao framework mainz. Cada secao apresenta um conceito e leva voce para o proximo nivel com exemplos praticos em TSX.",
        tutorialCta: "Iniciar trilha guiada",
        workshopCta: "Abrir oficina",
    },
    journey: {
        eyebrow: "Trilha guiada",
        title: "Avance pelos conceitos do framework",
        progressSuffix: "concluido",
        stages: [
            {
                label: "Fundacao",
                description: "Comece criando uma classe que estende Component e devolve seu markup em render().",
            },
            {
                label: "Estado",
                description: "Use initState para estado inicial e setState para atualizar a pagina de forma previsivel.",
            },
            {
                label: "Eventos",
                description: "Conecte botoes e inputs com onClick e onInput para responder a cada interacao.",
            },
            {
                label: "Composicao",
                description: "Combine componentes pequenos para montar paginas maiores e mais legiveis.",
            },
        ],
        codeTitle: "Codigo da etapa selecionada",
        snippets: [
            "import { Component } from \"mainz\";\n\n// Fundacao: crie seu componente raiz\nexport class HomePage extends Component {\n    override render() {\n        return (\n            <main>\n                <h1>mainz</h1>\n            </main>\n        );\n    }\n}",
            "interface HomeState {\n    count: number;\n}\n\n// Estado: inicialize antes da primeira renderizacao\nprotected override initState(): HomeState {\n    return {\n        count: 0,\n    };\n}",
            "// Eventos: atualize estado com interacoes\nprivate increment = () => {\n    this.setState({\n        count: this.state.count + 1,\n    });\n};\n\noverride render() {\n    return (\n        <button type=\"button\" onClick={this.increment}>\n            {this.state.count}\n        </button>\n    );\n}",
            "// Composicao: combine blocos reutilizaveis\noverride render() {\n    return (\n        <main>\n            <HeroIntro />\n            <ConceptCard title=\"...\" description=\"...\" tag=\"BASE\" />\n            <InteractiveSandbox />\n        </main>\n    );\n}",
        ],
    },
    concepts: {
        eyebrow: "Conceitos base",
        title: "Fundamentos para imprimir sua primeira pagina",
        cards: [
            {
                title: "Componente como matriz",
                description: "Cada classe Component funciona como uma matriz tipografica: voce define a forma e reutiliza.",
                tag: "BASE",
            },
            {
                title: "Estado como tinta viva",
                description: "A cada setState, a interface recebe nova impressao e o DOM e atualizado com patch incremental.",
                tag: "STATE",
            },
            {
                title: "Eventos de oficina",
                description: "Handlers no TSX simplificam as interacoes sem perder controle sobre o ciclo de vida.",
                tag: "EVENT",
            },
            {
                title: "Secoes compostas",
                description: "Separar Hero, Cards e Sandbox deixa o projeto escalavel e facil de manter.",
                tag: "ARCH",
            },
        ],
    },
    checkpoint: {
        eyebrow: "Checkpoint",
        title: "Checagem rapida de entendimento",
        description: "Antes de seguir, valide uma ideia-chave do framework.",
        progressLabel: "Pergunta",
        submit: "Validar resposta",
        next: "Proxima pergunta",
        finish: "Finalizar checkpoint",
        retry: "Tentar checkpoint novamente",
        items: [
            {
                question: "Qual metodo deve inicializar estado antes da primeira renderizacao?",
                options: [
                    "initState",
                    "onMount",
                    "constructor render hook",
                ],
                correctIndex: 0,
                success: "Correto. initState roda antes da primeira renderizacao e deixa o bootstrap previsivel.",
                failure: "Ainda nao. Tente novamente olhando para o ciclo de vida de estado inicial.",
            },
            {
                question: "Qual metodo voce deve chamar para atualizar estado de forma reativa?",
                options: [
                    "setState",
                    "render",
                    "registerDOMEvent",
                ],
                correctIndex: 0,
                success: "Isso mesmo. setState mescla estado parcial e dispara novo ciclo de renderizacao.",
                failure: "Quase. No mainz, as atualizacoes de UI devem passar por setState.",
            },
            {
                question: "Qual padrao mantem paginas grandes sustentaveis no mainz?",
                options: [
                    "Compor componentes pequenos e reutilizaveis",
                    "Colocar toda UI em um unico render gigante",
                    "Evitar props entre secoes",
                ],
                correctIndex: 0,
                success: "Perfeito. Composicao melhora legibilidade, reuso e evolucao do projeto.",
                failure: "Nao e o ideal. Prefira composicao com componentes focados.",
            },
        ],
    },
    sandbox: {
        eyebrow: "Oficina",
        title: "Construa seu componente Todo",
        description: "Complete desafios escrevendo codigo. Um validador JavaScript confere sua entrada e libera a proxima etapa.",
        challengeLabel: "Desafio",
        editorLabel: "Escreva seu codigo",
        validate: "Validar resposta",
        next: "Proximo desafio",
        restart: "Reiniciar oficina",
        successPrefix: "Passou",
        failPrefix: "Ainda nao",
        finalTitle: "Componente final pronto",
        finalDescription: "Excelente. Voce concluiu os desafios e agora tem um componente completo para usar.",
        challenges: [
            {
                title: "Desafio 1: Fundacao",
                instruction: "Crie `import { Component } from \"mainz\"` e uma classe chamada `Todo` com `class Todo extends Component`.",
                starter:
                    "// Passo 1\n// Crie a estrutura base da classe Todo\n",
                success: "Perfeito. A base da classe Todo esta pronta.",
                hint: "Voce precisa dos dois: `import { Component } from \"mainz\"` e `class Todo extends Component`.",
            },
            {
                title: "Desafio 2: Estado inicial",
                instruction: "Dentro da classe `Todo`, adicione `initState()` retornando `{ draft: \"\", items: [] }`.",
                starter:
                    "import { Component } from \"mainz\";\n\nclass Todo extends Component {\n    // Passo 2: adicione initState\n}\n",
                success: "Otimo. Todo agora comeca com estado previsivel.",
                hint: "Adicione `initState()` e retorne um objeto com `draft` e `items`.",
            },
            {
                title: "Desafio 3: Evento + render",
                instruction: "Ainda em `Todo`, adicione `handleDraftInput`, `addTodo` e renderize input + botao + lista com `items.map(...)`.",
                starter:
                    "import { Component } from \"mainz\";\n\nclass Todo extends Component {\n    protected override initState() {\n        return {\n            draft: \"\",\n            items: [],\n        };\n    }\n\n    // Passo 3: adicione handlers e render da UI Todo\n}\n",
                success: "Excelente. Comportamento e render da Todo estao completos.",
                hint: "Use `setState`, conecte `onInput` e `onClick`, e renderize a lista com `this.state.items.map(...)`.",
            },
        ],
        finalCode:
            "import { Component } from \"mainz\";\n\ninterface TodoState {\n    draft: string;\n    items: string[];\n}\n\nexport class Todo extends Component<{}, TodoState> {\n    protected override initState(): TodoState {\n        return {\n            draft: \"\",\n            items: [],\n        };\n    }\n\n    private handleDraftInput = (event: Event) => {\n        const input = event.target as HTMLInputElement;\n        this.setState({\n            draft: input.value,\n        });\n    };\n\n    private addTodo = () => {\n        const nextItem = this.state.draft.trim();\n        if (!nextItem) return;\n\n        this.setState({\n            draft: \"\",\n            items: [...this.state.items, nextItem],\n        });\n    };\n\n    override render(): HTMLElement {\n        return (\n            <main>\n                <h2>Todo</h2>\n                <input\n                    type=\"text\"\n                    value={this.state.draft}\n                    onInput={this.handleDraftInput}\n                    placeholder=\"Escreva uma tarefa\"\n                />\n                <button type=\"button\" onClick={this.addTodo}>\n                    Adicionar\n                </button>\n                <ul>\n                    {this.state.items.map((item, index) => (\n                        <li key={`${item}-${index}`}>{item}</li>\n                    ))}\n                </ul>\n            </main>\n        );\n    }\n}\n\nconst app = document.querySelector(\"#app\");\n\nif (!app) {\n    throw new Error(\"App container not found\");\n}\n\napp.append(<Todo />);",
    },
    nextSteps: {
        eyebrow: "Proximos passos",
        title: "Depois desta pagina",
        cards: [
            {
                title: "1. Separar em modulos",
                description: "Mova cada componente para um arquivo proprio e mantenha o entrypoint limpo.",
            },
            {
                title: "2. Criar exemplos tematicos",
                description: "Adicione exemplos de listas, formularios e composicao para ampliar o tutorial.",
            },
            {
                title: "3. Publicar no GitHub Pages",
                description: "Rode o build do site e publique a pasta de saida para manter a pagina atualizada.",
            },
        ],
    },
    footer: {
        note: "Codigo aberto inspirado na tradicao tipografica de Mainz.",
        sourceLabel: "Ver codigo no GitHub",
    },
};

export default pt;
