import { useRef, useState, useEffect } from "react";
import {
  AudioLines, Plus, Send, Paperclip, Sparkles, ChevronDown,
  X, FileText, Globe, Code2, BrainCircuit, History, PanelLeft,
  Settings2, MessageSquare, Check, Plug,
  Maximize2, Minimize2, Brain, Cpu, Zap
} from "lucide-react";
import ApiConfig, { useApiConfig } from "./components/ApiConfig";

const starterPrompts = [
  { icon: Code2, label: "Código", text: "Me ajuda com código." },
  { icon: Globe, label: "Pesquisa", text: "Quero pesquisar algo." },
  { icon: FileText, label: "Arquivos", text: "Analisa um arquivo." },
  { icon: Sparkles, label: "Ideias", text: "Me ajuda com ideias." },
];

function ThinkingBox({ isThinking }) {
  if (!isThinking) return null;
  return (
    <div className="thinking-box">
      <div className="thinking-header">
        <Brain size={14} />
        <span>Pensando</span>
        <div className="thinking-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  );
}

function TokenCounter({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100);
  return (
    <div className={`token-counter ${pct > 80 ? 'low' : ''}`}>
      <Cpu size={12} />
      <span>{(used / 1000000).toFixed(1)}M / {(limit / 1000000).toFixed(0)}M</span>
      <div className="token-bar"><div className="token-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [model, setModel] = useState("auto");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const { config, isConfigured, updateConfig } = useApiConfig();
  const TOKEN_LIMIT = 1800000000;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = prompt.trim();
    if (!text) return;

    const inputTokens = Math.ceil(text.length / 4);
    setMessages(prev => [...prev, { role: "user", text, tokens: inputTokens }]);
    setPrompt("");

    if (!isConfigured()) {
      setMessages(prev => [...prev, { role: "assistant", text: "⚠️ Configure a API (🔌)" }]);
      return;
    }

    setIsLoading(true);
    setIsThinking(true);

    try {
      // Tenta streaming primeiro
      const response = await fetch(`${config.url}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: text }], stream: true }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type') || '';

      // Verifica se é realmente SSE
      if (contentType.includes('text/event-stream')) {
        await handleStreaming(response, inputTokens);
      } else {
        // Fallback: resposta completa
        const data = await response.json();
        const outputText = data.choices?.[0]?.message?.content || "Sem resposta";
        const outputTokens = data.usage?.completion_tokens || Math.ceil(outputText.length / 4);

        setMessages(prev => [...prev, {
          role: "assistant",
          text: outputText,
          tokens: inputTokens + outputTokens,
          model: data.model || model
        }]);
        setTokensUsed(prev => prev + inputTokens + outputTokens);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `❌ ${err.message}`, isError: true }]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const handleStreaming = async (response, inputTokens) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    setMessages(prev => [...prev, {
      role: "assistant", text: "", streaming: true, tokens: inputTokens, model
    }]);

    setIsThinking(false);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            const outTokens = Math.ceil(fullText.length / 4);
            setMessages(prev => {
              const updated = [...prev];
              const i = updated.length - 1;
              if (updated[i]?.streaming) {
                updated[i] = { ...updated[i], text: fullText, tokens: inputTokens + outTokens };
              }
              return updated;
            });
          }
        } catch {}
      }
    }

    // Finaliza
    const outTokens = Math.ceil(fullText.length / 4);
    setMessages(prev => {
      const updated = [...prev];
      const i = updated.length - 1;
      if (updated[i]?.streaming) {
        updated[i] = { ...updated[i], streaming: false, text: fullText || "...", tokens: inputTokens + outTokens };
      }
      return updated;
    });
    setTokensUsed(prev => prev + inputTokens + outTokens);
  };

  return (
    <div className={`chat-app ${isFullscreen ? 'fullscreen' : ''}`}>
      <aside className={`chat-sidebar ${historyOpen ? "open" : ""}`}>
        <div className="sidebar-brand-row">
          <a className="chat-brand" href="#" onClick={(e) => { e.preventDefault(); setMessages([]); setTokensUsed(0); }}>
            <span className="chat-brand-icon"><AudioLines size={19} /></span>
            <span>AGENT<span className="brand-dashes">---</span></span>
          </a>
          <button className="chat-icon-button" onClick={() => setHistoryOpen(false)}><X size={18} /></button>
        </div>
        <button className="new-chat-button" onClick={() => { setMessages([]); setTokensUsed(0); }}>
          <Plus size={17} /> Novo chat
        </button>
        <div className="history-label"><History size={13} /> Recentes</div>
        {messages.length > 0 ? (
          <button className="history-item"><MessageSquare size={15} /><span>{messages.find(m => m.role === "user")?.text.slice(0, 20) || "Chat"}</span></button>
        ) : <div className="history-empty">Sem conversas</div>}
        <div className="sidebar-stats"><TokenCounter used={tokensUsed} limit={TOKEN_LIMIT} /></div>
        <div className="sidebar-bottom">
          <button className={`sidebar-setting ${isConfigured() ? 'configured' : ''}`} onClick={() => setShowApiConfig(true)}>
            <Plug size={16} /> {isConfigured() ? "API ✓" : "Configurar"}
          </button>
        </div>
      </aside>

      {historyOpen && <div className="sidebar-overlay" onClick={() => setHistoryOpen(false)} />}

      <main className="chat-main">
        <header className="chat-header">
          <div className="header-left">
            <button className="chat-icon-button" onClick={() => setHistoryOpen(true)}><PanelLeft size={20} /></button>
            <span className="header-product">AGENT---</span>
            <div className="model-selector-wrap">
              <button className="model-selector" onClick={() => setModelMenuOpen(!modelMenuOpen)}>
                <Zap size={12} /> {model}<ChevronDown size={14} />
              </button>
              {modelMenuOpen && (
                <div className="model-dropdown">
                  {["auto", "auto:fast", "auto:smart", "fusion"].map(m => (
                    <button key={m} onClick={() => { setModel(m); setModelMenuOpen(false); }}>{m}{model === m && <Check size={14} />}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="header-right">
            <span className={isConfigured() ? "status-dot online" : "status-dot offline"} />
            <button className="chat-icon-button" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>

        <section className="conversation-area">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-mark"><Sparkles size={23} /></div>
              <h1>O que vamos fazer?</h1>
              <div className="starter-grid">
                {starterPrompts.map(({ icon: Icon, label, text }) => (
                  <button className="starter-card" key={label} onClick={() => setPrompt(text)}>
                    <Icon size={17} /><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                  {msg.role === "assistant" && <span className="assistant-avatar"><AudioLines size={15} /></span>}
                  <div className="message-content">
                    <div className="message-label">
                      <span>{msg.role === "user" ? "Você" : "AGENT"}</span>
                      {msg.model && <span className="model-badge">{msg.model}</span>}
                      {msg.tokens > 0 && <span className="token-badge">{msg.tokens}t</span>}
                      {msg.streaming && <span className="streaming-badge">●</span>}
                    </div>
                    <p className={msg.streaming ? 'streaming-text' : ''}>{msg.text}</p>
                  </div>
                </div>
              ))}
              <ThinkingBox isThinking={isThinking} />
              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        <div className="composer-zone">
          <form className="chat-composer" onSubmit={sendMessage}>
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
              placeholder={isConfigured() ? "Pergunte..." : "Configure a API (🔌)"}
              rows={1}
              disabled={isLoading}
            />
            <div className="composer-toolbar">
              <button className="send-message-button" type="submit" disabled={!prompt.trim() || isLoading}>
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </main>

      {showApiConfig && (
        <div className="modal-overlay" onClick={() => setShowApiConfig(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ApiConfig onConfigSave={(c) => { updateConfig(c); setShowApiConfig(false); }} onClose={() => setShowApiConfig(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
