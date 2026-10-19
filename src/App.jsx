import { useRef, useState, useEffect } from "react";
import {
  AudioLines, Plus, Send, Paperclip, Wrench, Sparkles, ChevronDown,
  X, FileText, Globe, Code2, BrainCircuit, History, PanelLeft,
  Settings2, MessageSquare, Mic, Check, SlidersHorizontal, Plug,
  Maximize2, Minimize2, Brain, Cpu, Zap
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

// Componente de caixa de pensamento
function ThinkingBox({ isThinking, content }) {
  if (!isThinking && !content) return null;

  return (
    <div className="thinking-box">
      <div className="thinking-header">
        <Brain size={14} />
        <span>Pensando...</span>
        {isThinking && <div className="thinking-dots"><span></span><span></span><span></span></div>}
      </div>
      {content && <div className="thinking-content">{content}</div>}
    </div>
  );
}

// Componente de contador de tokens
function TokenCounter({ used, limit }) {
  const percentage = Math.min((used / limit) * 100, 100);
  const isLow = percentage > 80;

  return (
    <div className={`token-counter ${isLow ? 'low' : ''}`}>
      <Cpu size={12} />
      <span>{used.toLocaleString()} / {limit.toLocaleString()}</span>
      <div className="token-bar">
        <div className="token-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [thinking, setThinking] = useState({ isThinking: false, content: "" });
  const messagesEndRef = useRef(null);
  const fileInput = useRef(null);

  const { config, isConfigured, updateConfig } = useApiConfig();
  const TOKEN_LIMIT = 1800000000; // 1.8B

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const startPrompt = (text) => setPrompt(text);

  // Streaming response
  const sendMessage = async (event) => {
    event?.preventDefault?.();
    const text = prompt.trim();
    if (!text && files.length === 0) return;

    const userText = [text, files.length ? "Arquivos: " + files.map((file) => file.name).join(", ") : ""].filter(Boolean).join("\n");

    setMessages((current) => [...current, { role: "user", text: userText, tokens: estimateTokens(userText) }]);
    setPrompt("");
    setFiles([]);
    setMenuOpen(false);
    setActivePanel("");

    if (!isConfigured()) {
      setMessages((current) => [...current, {
        role: "assistant",
        text: "⚠️ FreeLLMAPI não configurado! Clique no ícone 🔌 na barra lateral para configurar."
      }]);
      return;
    }

    setIsLoading(true);
    setThinking({ isThinking: true, content: "Analisando sua mensagem..." });

    try {
      const response = await fetch(`${config.url}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: userText }],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let inputTokens = estimateTokens(userText);
      let outputTokens = 0;

      setThinking({ isThinking: false, content: "" });
      setMessages((current) => [...current, {
        role: "assistant",
        text: "",
        streaming: true,
        tokens: 0
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              fullText += delta;
              outputTokens = estimateTokens(fullText);

              // Update streaming message
              setMessages((current) => {
                const updated = [...current];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.streaming) {
                  lastMsg.text = fullText;
                  lastMsg.tokens = inputTokens + outputTokens;
                }
                return updated;
              });
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Finalize message
      setMessages((current) => {
        const updated = [...current];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.streaming) {
          lastMsg.streaming = false;
          lastMsg.text = fullText;
          lastMsg.tokens = inputTokens + outputTokens;
          lastMsg.model = model;
        }
        return updated;
      });

      setTokensUsed(prev => prev + inputTokens + outputTokens);

    } catch (error) {
      setThinking({ isThinking: false, content: "" });
      setMessages((current) => [...current, {
        role: "assistant",
        text: `❌ Erro: ${error.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Estimate tokens (rough: ~4 chars per token)
  const estimateTokens = (text) => Math.ceil(text.length / 4);

  const toggle = (value, setter) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return (
    <div className={`chat-app ${isFullscreen ? 'fullscreen' : ''}`}>
      <aside className={`chat-sidebar ${historyOpen ? "" : "sidebar-collapsed"}`}>
        <div className="sidebar-brand-row">
          <a className="chat-brand" href="#" onClick={(e) => { e.preventDefault(); setMessages([]); }}>
            <span className="chat-brand-icon"><AudioLines size={19} /></span>
            {historyOpen && <span>AGENT<span className="brand-dashes">---</span></span>}
          </a>
          <button className="chat-icon-button sidebar-toggle" onClick={() => setHistoryOpen(false)}><PanelLeft size={17} /></button>
        </div>
        <button className="new-chat-button" onClick={() => { setMessages([]); setPrompt(""); setTokensUsed(0); }}>
          <Plus size={17} />{historyOpen && "Novo chat"}
        </button>
        {historyOpen && <>
          <div className="history-label"><History size={13} /> Recentes</div>
          {messages.length > 0 ? <button className="history-item active"><MessageSquare size={15} /><span>{messages.find((m) => m.role === "user")?.text.slice(0, 28) || "Conversa nova"}</span></button> : <div className="history-empty">Suas conversas vão aparecer aqui.</div>}

          <div className="sidebar-stats">
            <TokenCounter used={tokensUsed} limit={TOKEN_LIMIT} />
          </div>

          <div className="sidebar-bottom">
            <button 
              className={`sidebar-setting ${isConfigured() ? 'configured' : ''}`} 
              onClick={() => setShowApiConfig(true)}
            >
              <Plug size={16} /> 
              {isConfigured() ? "API Conectada ✓" : "Configurar API"}
            </button>
            <button className="sidebar-setting" onClick={() => setActivePanel(activePanel === "settings" ? "" : "settings")}><Settings2 size={16} /> Configurações</button>
            <div className="sidebar-version">AGENT--- · v1.0</div>
          </div>
        </>}
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div className="header-left">
            {!historyOpen && <button className="chat-icon-button" onClick={() => setHistoryOpen(true)}><PanelLeft size={18} /></button>}
            <span className="header-product">AGENT---</span>
            <span className="header-divider">/</span>
            <div className="model-selector-wrap">
              <button className="model-selector" onClick={() => setModelMenuOpen(!modelMenuOpen)}>
                <Zap size={12} /> {model}<ChevronDown size={14} />
              </button>
              {modelMenuOpen && <div className="model-dropdown">
                {["auto", "auto:fast", "auto:smart", "fusion"].map((item) => (
                  <button key={item} onClick={() => { setModel(item); setModelMenuOpen(false); }}>{item}{model === item && <Check size={14} />}</button>
                ))}
              </div>}
            </div>
          </div>
          <div className="header-right">
            <div className="prototype-indicator">
              <span className={isConfigured() ? "status-dot online" : "status-dot offline"} /> 
              {isConfigured() ? "Online" : "Offline"}
            </div>
            <button className="chat-icon-button fullscreen-btn" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>

        <section className={`conversation-area ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-mark"><Sparkles size={23} /></div>
              <h1>O que vamos fazer hoje?</h1>
              <p>Uma ideia, uma dúvida ou um projeto inteiro. Manda aí. ✨</p>
              <div className="starter-grid">
                {starterPrompts.map(({ icon: Icon, label, text }) => (
                  <button className="starter-card" key={label} onClick={() => startPrompt(text)}>
                    <Icon size={17} /><span>{label}</span><span className="starter-arrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message, index) => (
                <div className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`} key={index}>
                  {message.role === "assistant" && (
                    <span className="assistant-avatar"><AudioLines size={15} /></span>
                  )}
                  <div className="message-content">
                    <div className="message-label">
                      {message.role === "user" ? "Você" : "AGENT---"}
                      {message.model && <span className="model-badge">{message.model}</span>}
                      {message.tokens && (
                        <span className="token-badge">
                          <Cpu size={10} /> {message.tokens.toLocaleString()} tokens
                        </span>
                      )}
                      {message.streaming && <span className="streaming-badge">▶ streaming</span>}
                    </div>
                    <p className={message.streaming ? 'streaming-text' : ''}>{message.text}</p>
                  </div>
                </div>
              ))}

              <ThinkingBox isThinking={thinking.isThinking} content={thinking.content} />
              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        <div className="composer-zone">
          {(selectedTools.length > 0 || selectedSkills.length > 0 || files.length > 0) && (
            <div className="selection-chips">
              {selectedTools.map((item) => (
                <span className="selection-chip" key={item}>
                  <Wrench size={12} />{item}
                  <button onClick={() => toggle(item, setSelectedTools)}><X size={12} /></button>
                </span>
              ))}
              {selectedSkills.map((item) => (
                <span className="selection-chip skill-chip" key={item}>
                  <Sparkles size={12} />{item}
                  <button onClick={() => toggle(item, setSelectedSkills)}><X size={12} /></button>
                </span>
              ))}
              {files.map((file, i) => (
                <span className="selection-chip file-chip" key={file.name + i}>
                  <Paperclip size={12} />{file.name}
                  <button onClick={() => setFiles((current) => current.filter((_, j) => j !== i))}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}

          <form className="chat-composer" onSubmit={sendMessage}>
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} 
              placeholder={isConfigured() ? "Pergunte alguma coisa..." : "Configure a API primeiro (ícone 🔌)"} 
              rows={2} 
              disabled={isLoading}
            />
            <div className="composer-toolbar">
              <div className="composer-left-actions">
                <button className={`plus-button ${menuOpen ? "plus-active" : ""}`} type="button" onClick={() => { setMenuOpen(!menuOpen); setActivePanel(""); }}>
                  <Plus size={20} />
                </button>
                <button className="composer-tool-button" type="button" onClick={() => { setActivePanel(activePanel === "tools" ? "" : "tools"); setMenuOpen(false); }}>
                  <Wrench size={14} /><span>Ferramentas</span>
                </button>
                <button className="composer-tool-button" type="button" onClick={() => { setActivePanel(activePanel === "skills" ? "" : "skills"); setMenuOpen(false); }}>
                  <Sparkles size={14} /><span>Habilidades</span>
                </button>
              </div>
              <div className="composer-right-actions">
                <span className="enter-hint">Enter para enviar</span>
                <button className="mic-button" type="button"><Mic size={17} /></button>
                <button className="send-message-button" type="submit" disabled={(!prompt.trim() && files.length === 0) || isLoading}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </form>
          <input ref={fileInput} className="hidden-file-input" type="file" multiple onChange={(e) => { setFiles((current) => [...current, ...Array.from(e.target.files || [])]); e.target.value = ""; }} />
        </div>
      </main>

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
