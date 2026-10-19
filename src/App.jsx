import { useRef, useState } from "react";
import {
  AudioLines, Plus, Send, Paperclip, Wrench, Sparkles, ChevronDown,
  X, FileText, Globe, Code2, BrainCircuit, Image, History, PanelLeft,
  Settings2, MessageSquare, Mic, Check, SlidersHorizontal, Plug
} from "lucide-react";
import ApiConfig, { useApiConfig, callFreeLLMAPI } from "./components/ApiConfig";

const starterPrompts = [
  { icon: Code2, label: "Me ajuda com código", text: "Me ajuda a resolver um problema de código." },
  { icon: Globe, label: "Pesquisar na web", text: "Quero pesquisar um assunto e entender as fontes." },
  { icon: FileText, label: "Trabalhar com arquivos", text: "Me ajuda a analisar um arquivo." },
  { icon: Sparkles, label: "Criar uma ideia", text: "Me ajuda a transformar uma ideia em um plano." },
];

const toolOptions = [
  { icon: Globe, title: "Pesquisa na web", detail: "Encontrar informações e fontes" },
  { icon: Code2, title: "Ajuda com código", detail: "Analisar e escrever código" },
  { icon: FileText, title: "Análise de arquivos", detail: "Trabalhar com documentos enviados" },
];
const skillOptions = [
  { icon: BrainCircuit, title: "Planejamento", detail: "Dividir tarefas em etapas" },
  { icon: Sparkles, title: "Escrita", detail: "Criar, revisar e melhorar textos" },
  { icon: SlidersHorizontal, title: "Análise crítica", detail: "Comparar opções e encontrar problemas" },
];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState("");
  const [selectedTools, setSelectedTools] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [files, setFiles] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [model, setModel] = useState("auto");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInput = useRef(null);

  // Configuração da API
  const { config, isConfigured, updateConfig } = useApiConfig();

  const startPrompt = (text) => setPrompt(text);

  const sendMessage = async (event) => {
    event?.preventDefault?.();
    const text = prompt.trim();
    if (!text && files.length === 0) return;

    const userText = [text, files.length ? "Arquivos: " + files.map((file) => file.name).join(", ") : ""].filter(Boolean).join("\n");

    // Adiciona mensagem do usuário
    setMessages((current) => [...current, { role: "user", text: userText }]);
    setPrompt("");
    setFiles([]);
    setMenuOpen(false);
    setActivePanel("");

    // Se não tem API configurada, mostra mensagem mock
    if (!isConfigured()) {
      setMessages((current) => [...current, {
        role: "assistant",
        text: "⚠️ FreeLLMAPI não configurado! Clique no ícone 🔌 na barra lateral para configurar."
      }]);
      return;
    }

    // Chama a API real
    setIsLoading(true);
    try {
      const response = await callFreeLLMAPI(config, [
        { role: "user", content: userText }
      ], { model });

      const assistantText = response.choices?.[0]?.message?.content || "Sem resposta";
      const routedVia = response.headers?.get?.("x-routed-via") || "auto";

      setMessages((current) => [...current, {
        role: "assistant",
        text: assistantText,
        model: routedVia
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        text: `❌ Erro: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (value, setter) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return (
    <div className="chat-app">
      <aside className={`chat-sidebar ${historyOpen ? "" : "sidebar-collapsed"}`}>
        <div className="sidebar-brand-row">
          <a className="chat-brand" href="#" onClick={(e) => { e.preventDefault(); setMessages([]); }}>
            <span className="chat-brand-icon"><AudioLines size={19} /></span>
            {historyOpen && <span>AGENT<span className="brand-dashes">---</span></span>}
          </a>
          <button className="chat-icon-button sidebar-toggle" title="Recolher histórico" onClick={() => setHistoryOpen(false)}><PanelLeft size={17} /></button>
        </div>
        <button className="new-chat-button" onClick={() => { setMessages([]); setPrompt(""); }}><Plus size={17} />{historyOpen && "Novo chat"}</button>
        {historyOpen && <>
          <div className="history-label"><History size={13} /> Recentes</div>
          {messages.length > 0 ? <button className="history-item active"><MessageSquare size={15} /><span>{messages.find((m) => m.role === "user")?.text.slice(0, 28) || "Conversa nova"}</span></button> : <div className="history-empty">Suas conversas vão aparecer aqui.</div>}
          <div className="sidebar-bottom">
            <button 
              className={`sidebar-setting ${isConfigured() ? 'configured' : ''}`} 
              onClick={() => setShowApiConfig(true)}
            >
              <Plug size={16} /> 
              {isConfigured() ? "API Conectada ✓" : "Configurar API"}
            </button>
            <button className="sidebar-setting" onClick={() => setActivePanel(activePanel === "settings" ? "" : "settings")}><Settings2 size={16} /> Configurações</button>
            <div className="sidebar-version">AGENT--- · Protótipo</div>
          </div>
        </>}
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div className="header-left">
            {!historyOpen && <button className="chat-icon-button" title="Mostrar histórico" onClick={() => setHistoryOpen(true)}><PanelLeft size={18} /></button>}
            <span className="header-product">AGENT---</span>
            <span className="header-divider">/</span>
            <div className="model-selector-wrap">
              <button className="model-selector" onClick={() => setModelMenuOpen(!modelMenuOpen)}>{model}<ChevronDown size={14} /></button>
              {modelMenuOpen && <div className="model-dropdown">
                {["auto", "auto:fast", "auto:smart", "fusion"].map((item) => (
                  <button key={item} onClick={() => { setModel(item); setModelMenuOpen(false); }}>{item}{model === item && <Check size={14} />}</button>
                ))}
                <p>Modos de roteamento FreeLLMAPI</p>
              </div>}
            </div>
          </div>
          <div className="prototype-indicator">
            <span className={isConfigured() ? "status-dot online" : "status-dot offline"} /> 
            {isConfigured() ? "API Conectada" : "Modo protótipo"}
          </div>
        </header>

        <section className={`conversation-area ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? <div className="welcome">
            <div className="welcome-mark"><Sparkles size={23} /></div>
            <h1>O que vamos fazer hoje?</h1>
            <p>Uma ideia, uma dúvida ou um projeto inteiro. Manda aí. ✨</p>
            <div className="starter-grid">{starterPrompts.map(({ icon: Icon, label, text }) => <button className="starter-card" key={label} onClick={() => startPrompt(text)}><Icon size={17} /><span>{label}</span><span className="starter-arrow">↗</span></button>)}</div>
          </div> : <div className="messages-list">{messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={index}>
              {message.role === "assistant" && <span className="assistant-avatar"><AudioLines size={15} /></span>}
              <div className="message-content">
                <div className="message-label">
                  {message.role === "user" ? "Você" : "AGENT---"}
                  {message.model && <span className="model-badge">{message.model}</span>}
                </div>
                <p>{message.text}</p>
              </div>
            </div>
          ))}</div>}
          {isLoading && <div className="loading-indicator">Pensando...</div>}
        </section>

        <div className="composer-zone">
          {(selectedTools.length > 0 || selectedSkills.length > 0 || files.length > 0) && <div className="selection-chips">{selectedTools.map((item) => <span className="selection-chip" key={item}><Wrench size={12} />{item}<button onClick={() => toggle(item, setSelectedTools)}><X size={12} /></button></span>)}{selectedSkills.map((item) => <span className="selection-chip skill-chip" key={item}><Sparkles size={12} />{item}<button onClick={() => toggle(item, setSelectedSkills)}><X size={12} /></button></span>)}{files.map((file, i) => <span className="selection-chip file-chip" key={file.name + i}><Paperclip size={12} />{file.name}<button onClick={() => setFiles((current) => current.filter((_, j) => j !== i))}><X size={12} /></button></span>)}</div>}
          {activePanel && <div className="attachment-panel">
            <div className="attachment-panel-header"><div><strong>{activePanel === "tools" ? "Ferramentas" : activePanel === "skills" ? "Habilidades" : "Configurações"}</strong><p>{activePanel === "tools" ? "Escolha o que quer usar neste chat." : activePanel === "skills" ? "Adicione uma habilidade ao contexto." : "Preferências desta interface."}</p></div><button className="chat-icon-button" onClick={() => setActivePanel("")}><X size={16} /></button></div>
            {(activePanel === "tools" ? toolOptions : activePanel === "skills" ? skillOptions : [{icon: Settings2,title:"Modo de demonstração",detail:"As respostas ainda são simuladas"}]).map(({ icon: Icon, title, detail }) => {
              const list = activePanel === "tools" ? selectedTools : selectedSkills;
              const setter = activePanel === "tools" ? setSelectedTools : setSelectedSkills;
              return <button className="attachment-option" key={title} onClick={() => activePanel !== "settings" && toggle(title, setter)}><span className="attachment-option-icon"><Icon size={17} /></span><span className="attachment-option-copy"><strong>{title}</strong><small>{detail}</small></span>{activePanel === "settings" ? <span className="option-muted">Ativo</span> : list.includes(title) ? <Check size={16} className="option-check" /> : <Plus size={16} className="option-plus" />}</button>;
            })}
          </div>}
          {menuOpen && <div className="plus-menu">
            <button onClick={() => { fileInput.current?.click(); setMenuOpen(false); }}><span className="plus-menu-icon"><Paperclip size={17} /></span><span><strong>Adicionar arquivos</strong><small>PDF, imagens e outros documentos</small></span></button>
            <button onClick={() => { setActivePanel(activePanel === "tools" ? "" : "tools"); setMenuOpen(false); }}><span className="plus-menu-icon"><Wrench size={17} /></span><span><strong>Ferramentas</strong><small>Pesquisa, código e arquivos</small></span></button>
            <button onClick={() => { setActivePanel(activePanel === "skills" ? "" : "skills"); setMenuOpen(false); }}><span className="plus-menu-icon"><Sparkles size={17} /></span><span><strong>Habilidades</strong><small>Planejamento, escrita e análise</small></span></button>
            <button onClick={() => { setModelMenuOpen(true); setMenuOpen(false); }}><span className="plus-menu-icon"><BrainCircuit size={17} /></span><span><strong>Escolher modelo</strong><small>Modos de roteamento</small></span></button>
          </div>}
          <form className="chat-composer" onSubmit={sendMessage}>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} placeholder={isConfigured() ? "Pergunte alguma coisa..." : "Configure a API primeiro (ícone 🔌)"} rows={2} aria-label="Escreva sua mensagem" disabled={isLoading} />
            <div className="composer-toolbar">
              <div className="composer-left-actions">
                <button className={`plus-button ${menuOpen ? "plus-active" : ""}`} type="button" aria-label="Abrir menu de anexos e ferramentas" onClick={() => { setMenuOpen(!menuOpen); setActivePanel(""); }}><Plus size={20} /></button>
                <button className="composer-tool-button" type="button" onClick={() => { setActivePanel(activePanel === "tools" ? "" : "tools"); setMenuOpen(false); }}><Wrench size={14} /><span>Ferramentas</span></button>
                <button className="composer-tool-button" type="button" onClick={() => { setActivePanel(activePanel === "skills" ? "" : "skills"); setMenuOpen(false); }}><Sparkles size={14} /><span>Habilidades</span></button>
              </div>
              <div className="composer-right-actions"><span className="enter-hint">Enter para enviar</span><button className="mic-button" type="button" title="Entrada de voz ainda não disponível"><Mic size={17} /></button><button className="send-message-button" type="submit" disabled={(!prompt.trim() && files.length === 0) || isLoading} aria-label="Enviar mensagem"><Send size={16} /></button></div>
            </div>
          </form>
          <input ref={fileInput} className="hidden-file-input" type="file" multiple onChange={(e) => { setFiles((current) => [...current, ...Array.from(e.target.files || [])]); e.target.value = ""; }} />
        </div>
      </main>

      {/* Modal de Configuração da API */}
      {showApiConfig && (
        <div className="modal-overlay" onClick={() => setShowApiConfig(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ApiConfig 
              onConfigSave={(newConfig) => {
                updateConfig(newConfig);
                setShowApiConfig(false);
              }}
              onClose={() => setShowApiConfig(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
