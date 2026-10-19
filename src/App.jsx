import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Cpu,
  FileCode2,
  Github,
  Layers3,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  initialRuns,
  navigation,
  providers,
  samplePrompts,
  tools,
} from "./data/mockData.js";

const pageCopy = {
  overview: {
    eyebrow: "WORKSPACE / 001",
    title: "Vamos construir algo inteligente.",
    subtitle: "Um espaço para transformar ideias em tarefas, ferramentas e experiências com IA.",
  },
  chat: {
    eyebrow: "WORKSPACE / CHAT",
    title: "Converse com o workspace.",
    subtitle: "Este chat é demonstrativo por enquanto. Nenhum modelo externo está conectado.",
  },
  tools: {
    eyebrow: "WORKSPACE / TOOLS",
    title: "Ferramentas à disposição.",
    subtitle: "O catálogo inicial do que o agente poderá usar quando começarmos as integrações.",
  },
  runs: {
    eyebrow: "WORKSPACE / ACTIVITY",
    title: "Tudo o que acontece, registrado.",
    subtitle: "Histórico local de demonstração para futuras execuções do agente.",
  },
  architecture: {
    eyebrow: "WORKSPACE / SYSTEM",
    title: "Peças pequenas. Um sistema só.",
    subtitle: "Uma arquitetura inicial que pode evoluir sem amarrar a interface a um provedor específico.",
  },
  settings: {
    eyebrow: "WORKSPACE / SETTINGS",
    title: "Configurações do projeto.",
    subtitle: "As integrações reais serão configuradas numa etapa posterior, com segredos mantidos fora do frontend.",
  },
};

function ProviderMark({ provider }) {
  return <span className={`provider-mark ${provider.color}`}>{provider.short}</span>;
}

function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ToolCard({ tool, onRun, compact = false }) {
  const Icon = tool.icon;
  return (
    <article className={`tool-card ${compact ? "compact" : ""}`}>
      <div className="tool-card-top">
        <span className="tool-icon"><Icon size={18} strokeWidth={1.8} /></span>
        <span className="pill muted"><span className="tiny-dot" />{tool.state}</span>
      </div>
      <div className="tool-card-copy">
        <span className="tool-category">{tool.category}</span>
        <h3>{tool.name}</h3>
        <p>{tool.description}</p>
      </div>
      <button className="text-action" onClick={() => onRun(tool)} type="button">
        Testar demonstração <ArrowUpRight size={14} />
      </button>
    </article>
  );
}

function EmptyChat({ onPrompt }) {
  return (
    <div className="empty-chat">
      <div className="empty-orb"><Sparkles size={24} /></div>
      <span className="eyebrow">UM NOVO COMEÇO</span>
      <h2>Qual é a próxima ideia?</h2>
      <p>Escreva uma tarefa ou comece com uma sugestão. As respostas nesta versão são simuladas.</p>
      <div className="suggestion-list">
        {samplePrompts.map((item) => (
          <button key={item} onClick={() => onPrompt(item)} className="suggestion" type="button">
            <span>{item}</span><ArrowUpRight size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatComposer({ value, onChange, onSubmit, compact = false }) {
  return (
    <form className={`composer ${compact ? "composer-compact" : ""}`} onSubmit={onSubmit}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit(event);
          }
        }}
        placeholder="Descreva uma tarefa, uma ideia ou um problema..."
        rows={compact ? 2 : 3}
        aria-label="Mensagem para o workspace"
      />
      <div className="composer-bottom">
        <div className="composer-hints">
          <span className="hint-chip"><Command size={12} /> Enter para enviar</span>
          <span className="draft-label">Modo protótipo</span>
        </div>
        <button className="send-button" type="submit" disabled={!value.trim()} aria-label="Enviar mensagem">
          <Send size={15} /><span>Enviar</span>
        </button>
      </div>
    </form>
  );
}

function ArchitectureView() {
  const stages = [
    { n: "01", title: "Interface", detail: "React + Vite", note: "O workspace que a pessoa usa", icon: Layers3 },
    { n: "02", title: "Camada de aplicação", detail: "A definir", note: "Estado, tarefas e permissões", icon: Settings2 },
    { n: "03", title: "Ferramentas", detail: "A definir", note: "Pesquisa, arquivos e execução", icon: WandSparkles },
    { n: "04", title: "Modelo de linguagem", detail: "Qwen 27B · planejado", note: "Inferência via serviço externo", icon: Cpu },
  ];
  return (
    <div className="architecture-layout">
      <section className="panel architecture-panel">
        <SectionHeading eyebrow="MAPA DO SISTEMA" title="Fluxo proposto" />
        <div className="architecture-flow">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div className="flow-part" key={stage.n}>
                <div className="flow-card">
                  <span className="flow-number">{stage.n}</span>
                  <span className="flow-icon"><Icon size={19} /></span>
                  <div><h3>{stage.title}</h3><span className="flow-detail">{stage.detail}</span><p>{stage.note}</p></div>
                  <span className="flow-state">Planejado</span>
                </div>
                {index < stages.length - 1 && <div className="flow-connector"><ArrowDownRight size={17} /></div>}
              </div>
            );
          })}
        </div>
        <p className="notice"><CircleHelp size={16} /> Este mapa é apenas uma hipótese inicial. Vamos ajustar a arquitetura antes de conectar serviços reais.</p>
      </section>
      <aside className="panel architecture-aside">
        <span className="eyebrow">PRINCÍPIOS</span>
        <div className="principle"><span className="principle-index">A</span><div><h3>Separação de responsabilidades</h3><p>Interface, lógica de negócio e integrações em camadas distintas.</p></div></div>
        <div className="principle"><span className="principle-index">B</span><div><h3>Provedores desacoplados</h3><p>Evitar espalhar detalhes de um modelo específico pela aplicação.</p></div></div>
        <div className="principle"><span className="principle-index">C</span><div><h3>Segredos no servidor</h3><p>Chaves de API nunca devem ser incluídas no bundle do navegador.</p></div></div>
      </aside>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("overview");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [runs, setRuns] = useState(initialRuns);
  const [toolSearch, setToolSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [runCount, setRunCount] = useState(0);

  const copy = pageCopy[activeView] || pageCopy.overview;
  const filteredTools = useMemo(
    () => tools.filter((tool) => `${tool.name} ${tool.category} ${tool.description}`.toLowerCase().includes(toolSearch.toLowerCase())),
    [toolSearch],
  );

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const sendPrompt = (event) => {
    event?.preventDefault?.();
    const text = prompt.trim();
    if (!text) return;
    const userMessage = { id: `user-${Date.now()}`, role: "user", text };
    const reply = {
      id: `assistant-${Date.now() + 1}`,
      role: "assistant",
      text: "Recebi sua ideia! Este protótipo ainda não chama um modelo de IA. Por enquanto, podemos validar a interface e o fluxo de trabalho; as integrações reais entram numa próxima etapa.",
    };
    setMessages((current) => [...current, userMessage, reply]);
    setPrompt("");
    setActiveView("chat");
  };

  const runTool = (tool) => {
    setRunCount((current) => current + 1);
    setRuns((current) => [{
      id: `demo-${Date.now()}`,
      title: tool.name,
      detail: "Execução visual de demonstração; nenhuma ferramenta externa foi chamada",
      status: "Simulada",
      time: "Agora",
    }, ...current].slice(0, 8));
    showToast(`Demonstração de "${tool.name}" registrada.`);
  };

  const chooseView = (id) => {
    setActiveView(id);
    setSidebarOpen(false);
  };

  const openChatWithPrompt = (text) => {
    setPrompt(text);
    setActiveView("chat");
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); chooseView("overview"); }}>
          <span className="brand-symbol"><AudioLines size={20} strokeWidth={2.2} /></span>
          <span className="brand-name">AGENT<span>---</span><small>LAB / PROTOTYPE</small></span>
        </a>

        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-label"><strong>Projeto principal</strong><span>Workspace local</span></div>
          <ChevronDown size={15} className="switcher-chevron" />
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => chooseView(item.id)} type="button">
                <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
                {item.id === "runs" && <span className="nav-count">{runCount}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-label provider-label">PROVEDORES <span className="soon-tag">EM BREVE</span></div>
        <div className="provider-list">
          {providers.map((provider) => (
            <div key={provider.name} className="provider-row">
              <ProviderMark provider={provider} />
              <span className="provider-name">{provider.name}</span>
              <span className="offline-indicator" title={provider.status} />
            </div>
          ))}
        </div>

        <div className="sidebar-spacer" />
        <div className="prototype-card">
          <div className="prototype-card-icon"><Zap size={15} /></div>
          <div><strong>Modo protótipo</strong><p>As ferramentas estão simuladas.</p></div>
          <span className="status-pip" />
        </div>
        <button className={`nav-item settings-link ${activeView === "settings" ? "active" : ""}`} onClick={() => chooseView("settings")} type="button">
          <Settings2 size={17} /><span>Configurações</span>
        </button>
        <div className="sidebar-footer"><span className="online-dot" /> Interface v0.1.0 <span>·</span> <a href="https://github.com/wsl04012011w-cyber/AGENT---" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={11} /></a></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" type="button"><Menu size={19} /></button>
            <div className="breadcrumb"><span>AGENT---</span><span className="breadcrumb-slash">/</span><strong>{navigation.find((item) => item.id === activeView)?.label || (activeView === "settings" ? "Configurações" : "Workspace")}</strong></div>
          </div>
          <div className="topbar-right">
            <span className="environment-badge"><span className="tiny-dot" /> Protótipo local</span>
            <button className="icon-button" aria-label="Notificações (demo)" onClick={() => showToast("Nenhuma notificação no protótipo.")} type="button"><Bell size={17} /></button>
            <span className="user-avatar" title="Perfil local">W</span>
          </div>
        </header>

        <div className="page-content">
          <section className="page-intro">
            <div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
            <button className="outline-button" onClick={() => showToast("Projeto em modo de demonstração.")} type="button"><Github size={15} /> <span>Projeto</span><ArrowUpRight size={13} /></button>
          </section>

          {activeView === "overview" && (
            <>
              <section className="hero-panel">
                <div className="hero-grid-lines" />
                <div className="hero-content">
                  <div className="hero-kicker"><Sparkles size={13} /> SEU ESPAÇO DE EXPERIMENTAÇÃO</div>
                  <h2>Da ideia ao <span>agente.</span><br />Um passo de cada vez.</h2>
                  <p>Planeje tarefas, explore ferramentas e construa a base do seu agente — começando pelo essencial.</p>
                  <button className="primary-button" onClick={() => chooseView("chat")} type="button">Abrir workspace <ArrowRight size={16} /></button>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
                  <div className="hero-core"><AudioLines size={36} strokeWidth={1.6} /></div>
                  <div className="orbit-node node-one"><BrainCircuit size={17} /></div>
                  <div className="orbit-node node-two"><Code2 size={17} /></div>
                  <div className="orbit-node node-three"><Zap size={16} /></div>
                  <div className="orbit-node node-four"><Layers3 size={17} /></div>
                </div>
                <div className="hero-index">SYS / 0001</div>
              </section>

              <section className="stats-grid" aria-label="Resumo do projeto">
                <div className="stat-card"><span className="stat-icon lavender"><Layers3 size={17} /></span><div><span className="stat-label">Ferramentas mapeadas</span><strong>{tools.length.toString().padStart(2, "0")}</strong></div><span className="stat-foot">Catálogo inicial</span></div>
                <div className="stat-card"><span className="stat-icon mint"><Cpu size={17} /></span><div><span className="stat-label">Provedores previstos</span><strong>04</strong></div><span className="stat-foot">Ainda desconectados</span></div>
                <div className="stat-card"><span className="stat-icon peach"><ActivityIcon /></span><div><span className="stat-label">Demos executadas</span><strong>{runCount.toString().padStart(2, "0")}</strong></div><span className="stat-foot">Nesta sessão</span></div>
              </section>

              <div className="dashboard-grid">
                <section className="panel task-panel">
                  <SectionHeading eyebrow="COMECE POR AQUI" title="O que vamos fazer?" action={<span className="step-count">01 / 03</span>} />
                  <ChatComposer value={prompt} onChange={setPrompt} onSubmit={sendPrompt} compact />
                  <div className="quick-prompts">
                    {samplePrompts.map((item, index) => <button key={item} onClick={() => openChatWithPrompt(item)} type="button"><span className="prompt-index">0{index + 1}</span>{item}<ArrowUpRight size={13} /></button>)}
                  </div>
                </section>

                <section className="panel providers-panel">
                  <SectionHeading eyebrow="CAMADA DE MODELOS" title="Provedores previstos" action={<span className="panel-counter">04</span>} />
                  <div className="providers-grid">
                    {providers.map((provider) => <div className="provider-card" key={provider.name}><ProviderMark provider={provider} /><div><strong>{provider.name}</strong><span><i /> Não conectado</span></div><MoreHorizontal size={16} /></div>)}
                  </div>
                  <div className="panel-footnote"><span className="tiny-dot" /> As conexões serão definidas numa próxima etapa.</div>
                </section>
              </div>

              <section className="tools-section">
                <SectionHeading eyebrow="CAPACIDADES DO SISTEMA" title="Caixa de ferramentas" action={<button className="text-action view-all" onClick={() => chooseView("tools")} type="button">Ver todas <ArrowRight size={14} /></button>} />
                <div className="tools-grid">
                  {tools.slice(0, 3).map((tool) => <ToolCard key={tool.id} tool={tool} onRun={runTool} compact />)}
                </div>
              </section>
            </>
          )}

          {activeView === "chat" && (
            <section className="chat-workspace panel">
              <div className="chat-topline"><div><span className="live-indicator" /> <strong>Workspace de tarefas</strong><span className="chat-model-label">Sem modelo conectado</span></div><button className="icon-button" onClick={() => setMessages([])} type="button" aria-label="Limpar conversa"><Plus size={17} /></button></div>
              <div className="chat-scroll">
                {messages.length === 0 ? <EmptyChat onPrompt={openChatWithPrompt} /> : (
                  <div className="message-list">
                    {messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}><div className={`message-avatar ${message.role}`}>{message.role === "user" ? "W" : <AudioLines size={17} />}</div><div className="message-body"><span className="message-author">{message.role === "user" ? "Você" : "AGENT--- · Demo"}</span><p>{message.text}</p></div></div>)}
                  </div>
                )}
              </div>
              <div className="chat-compose-wrap"><ChatComposer value={prompt} onChange={setPrompt} onSubmit={sendPrompt} /><p className="disclaimer">As respostas são demonstrativas. Nenhum conteúdo é enviado a um provedor externo.</p></div>
            </section>
          )}

          {activeView === "tools" && (
            <section className="panel tools-library">
              <div className="library-toolbar"><div className="search-field"><Search size={16} /><input value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} placeholder="Buscar ferramentas..." aria-label="Buscar ferramentas" /></div><span className="result-count">{filteredTools.length} ferramentas</span></div>
              {filteredTools.length ? <div className="tools-grid full-tools-grid">{filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} onRun={runTool} />)}</div> : <div className="no-results">Nenhuma ferramenta corresponde à busca.</div>}
              <div className="notice"><CircleHelp size={16} /> Estes cartões representam capacidades planejadas. O botão de demonstração registra apenas uma atividade local.</div>
            </section>
          )}

          {activeView === "runs" && (
            <section className="panel runs-panel">
              <SectionHeading eyebrow="LOG LOCAL" title="Atividade recente" action={<span className="pill muted">{runs.length} registros</span>} />
              <div className="runs-list">{runs.map((run) => <div key={run.id} className="run-row"><span className="run-icon"><Check size={16} /></span><div className="run-copy"><strong>{run.title}</strong><p>{run.detail}</p></div><span className="run-status">{run.status}</span><span className="run-time">{run.time}</span></div>)}</div>
              <p className="disclaimer">Este histórico existe somente na memória da página e será reiniciado ao recarregar.</p>
            </section>
          )}

          {activeView === "architecture" && <ArchitectureView />}

          {activeView === "settings" && (
            <div className="settings-layout">
              <section className="panel settings-panel"><SectionHeading eyebrow="CONFIGURAÇÃO" title="Ambiente do projeto" /><div className="setting-row"><div><strong>Modo de demonstração</strong><p>Interações locais, sem chamadas externas.</p></div><span className="setting-status enabled"><Check size={13} /> Ativo</span></div><div className="setting-row"><div><strong>Provedores de IA</strong><p>ChatGPT, Claude, Kimi e Groq ainda não foram conectados.</p></div><span className="setting-status">Pendente</span></div><div className="setting-row"><div><strong>Inferência Qwen 27B</strong><p>Endpoint e hospedagem serão definidos depois.</p></div><span className="setting-status">Pendente</span></div><div className="setting-row"><div><strong>Ferramentas externas</strong><p>Busca, acesso a arquivos e execução são demonstrações visuais.</p></div><span className="setting-status">Pendente</span></div></section>
              <aside className="panel safety-panel"><span className="safety-icon"><ShieldCheckIcon /></span><h3>Uma nota sobre segurança</h3><p>Não coloque tokens, senhas ou chaves de API no código React. Quando chegar a hora das integrações, os segredos devem ficar no servidor e nas variáveis de ambiente apropriadas.</p><a href="https://vercel.com/docs" target="_blank" rel="noreferrer">Documentação da Vercel <ArrowUpRight size={13} /></a></aside>
            </div>
          )}
          <footer className="page-footer"><span>AGENT--- <span className="footer-divider">/</span> Construído do zero, com calma.</span><span><i /> DEMO MODE <span className="footer-divider">·</span> SEM API CONECTADA</span></footer>
        </div>
      </main>
      {toast && <div className="toast" role="status"><Check size={16} />{toast}<button onClick={() => setToast("")} type="button" aria-label="Fechar aviso"><X size={14} /></button></div>}
    </div>
  );
}

function ActivityIcon() {
  return <Zap size={17} />;
}

function ShieldCheckIcon() {
  return <Check size={20} />;
}
