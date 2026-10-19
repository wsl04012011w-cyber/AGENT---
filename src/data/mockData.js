import {
  Activity,
  BrainCircuit,
  Code2,
  FileSearch,
  Globe,
  Layers3,
  Search,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";

export const navigation = [
  { id: "overview", label: "Visão geral", icon: Layers3 },
  { id: "chat", label: "Workspace", icon: BrainCircuit },
  { id: "tools", label: "Ferramentas", icon: Workflow },
  { id: "runs", label: "Execuções", icon: Activity },
  { id: "architecture", label: "Arquitetura", icon: Code2 },
];

export const providers = [
  { name: "ChatGPT", short: "GPT", color: "mint", status: "Não conectado" },
  { name: "Claude", short: "CL", color: "peach", status: "Não conectado" },
  { name: "Kimi", short: "KM", color: "violet", status: "Não conectado" },
  { name: "Groq", short: "GQ", color: "blue", status: "Não conectado" },
];

export const tools = [
  {
    id: "web-search",
    name: "Busca na web",
    description: "Pesquisa informações externas e reúne fontes para uma tarefa.",
    category: "Pesquisa",
    icon: Globe,
    state: "Planejada",
  },
  {
    id: "repo-reader",
    name: "Leitor de repositório",
    description: "Explora arquivos, pastas e documentação de um projeto.",
    category: "Desenvolvimento",
    icon: FileSearch,
    state: "Planejada",
  },
  {
    id: "code-runner",
    name: "Execução de código",
    description: "Executa tarefas isoladas e devolve logs e resultados.",
    category: "Desenvolvimento",
    icon: Terminal,
    state: "Planejada",
  },
  {
    id: "memory",
    name: "Memória de projeto",
    description: "Organiza decisões, contexto e informações úteis entre tarefas.",
    category: "Contexto",
    icon: BrainCircuit,
    state: "Planejada",
  },
  {
    id: "search-files",
    name: "Busca em arquivos",
    description: "Localiza trechos relevantes dentro dos arquivos disponíveis.",
    category: "Contexto",
    icon: Search,
    state: "Planejada",
  },
  {
    id: "safety-check",
    name: "Checagem de segurança",
    description: "Ajuda a revisar permissões, segredos e ações de risco.",
    category: "Sistema",
    icon: ShieldCheck,
    state: "Planejada",
  },
];

export const samplePrompts = [
  "Me ajude a planejar uma nova funcionalidade",
  "Analise a estrutura deste projeto",
  "Transforme uma ideia em tarefas pequenas",
];

export const initialRuns = [
  {
    id: "run-001",
    title: "Inicialização do workspace",
    detail: "Interface carregada em modo de demonstração",
    status: "Concluída",
    time: "Agora",
  },
  {
    id: "run-000",
    title: "Verificação das ferramentas",
    detail: "Catálogo local carregado; nenhuma API foi chamada",
    status: "Simulada",
    time: "Protótipo",
  },
];
