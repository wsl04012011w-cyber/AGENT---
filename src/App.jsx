import { useRef, useState, useEffect } from "react";
import {
  AudioLines, Plus, Send, Sparkles, ChevronDown,
  X, FileText, Globe, Code2, History, PanelLeft, MessageSquare,
  Check, Plug, Maximize2, Minimize2, Brain, Cpu, Zap
} from "lucide-react";
import ApiConfig, { useApiConfig } from "./components/ApiConfig";

const starterPrompts = [
  { icon: Code2, label: "Código", text: "Me ajuda com código." },
  { icon: Globe, label: "Pesquisa", text: "Quero pesquisar algo." },
  { icon: FileText, label: "Arquivos", text: "Analisa um arquivo." },
  { icon: Sparkles, label: "Ideias", text: "Me ajuda com ideias." },
];

function contentToText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    }).join("");
  }
  if (value && typeof value === "object" && typeof value.text === "string") {
    return value.text;
  }
  return "";
}

function getCompletionParts(payload) {
  const choice = payload?.choices?.[0] || {};
  const source = choice.delta || choice.message || {};
  const content = contentToText(source.content) || contentToText(choice.text);
  const reasoning =
    contentToText(source.reasoning) ||
    contentToText(source.reasoning_content) ||
    contentToText(source.reasoningContent) ||
    contentToText(source.analysis) ||
    contentToText(source.thinking) ||
    contentToText(source.thought);

  return { content, reasoning, usage: payload?.usage };
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
  const messagesEndRef = useRef(null);
  const { config, isConfigured, updateConfig } = useApiConfig();
  const TOKEN_LIMIT = 1800000000;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (isLoading) return;

    const text = prompt.trim();
    if (!text) return;

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setPrompt("");

    if (!isConfigured()) {
      setMessages([...newMessages, { role: "assistant", text: "⚠️ Configure a API (🔌)" }]);
      return;
    }

    setIsLoading(true);

    let fullText = "";
    let fullThinking = "";
    let usage = null;
    let rawResponse = "";
    let buffer = "";
    let sawSsePayload = false;
    let streamNotice = "";

    const updateStreamingMessage = () => {
      const currentTokens = usage?.total_tokens || Math.ceil((text.length + fullText.length) / 4);
      setMessages((previous) => {
        const updated = [...previous];
        for (let i = updated.length - 1; i >= 0; i -= 1) {
          if (updated[i].role === "assistant" && updated[i].streaming) {
            updated[i] = {
              ...updated[i],
              text: fullText,
              thinking: fullThinking,
              tokens: currentTokens,
            };
            break;
          }
        }
        return updated;
      });
    };

    const applyPayload = (payload) => {
      const apiError = payload?.error?.message ||
        (typeof payload?.error === "string" ? payload.error : "");
      if (apiError) throw new Error(apiError);

      const parts = getCompletionParts(payload);
      if (parts.usage) usage = parts.usage;
      if (parts.content) fullText += parts.content;
      if (parts.reasoning) fullThinking += parts.reasoning;

      if (parts.content || parts.reasoning || parts.usage) {
        updateStreamingMessage();
      }
    };

    const processSseLine = (rawLine) => {
      const line = rawLine.replace(/\r$/, "");
      if (!line.startsWith("data:")) return;

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") return;

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        // Ignora comentários e linhas SSE que não contenham JSON.
        return;
      }

      sawSsePayload = true;
      applyPayload(payload);
    };

    try {
      const requestUrl = `${config.url}/chat/completions`;
      const requestHeaders = {
        // Match the headers used by the working API test to avoid extra CORS preflight requirements.
        "Authorization": `Bearer ${config.key}`,
        "Content-Type": "application/json",
      };

      let response;
      let streamRequestFailed = false;

      try {
        response = await fetch(requestUrl, {
          method: "POST",
          headers: requestHeaders,
          cache: "no-store",
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: text }],
            stream: true,
          }),
        });
      } catch (streamError) {
        // Some API gateways/tunnels reject the streaming response at the browser layer.
        // Retry once without streaming so chat still works when ordinary chat requests do.
        streamRequestFailed = true;
        response = await fetch(requestUrl, {
          method: "POST",
          headers: requestHeaders,
          cache: "no-store",
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: text }],
            stream: false,
          }),
        });
      }

      if (streamRequestFailed) {
        streamNotice = "O pedido em streaming falhou no navegador; resposta obtida pelo modo normal. Verifique CORS/Cloudflare para habilitar streaming.";
      }

      const contentType = response.headers.get("content-type") || "não informado";

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const detail = errorBody.trim().slice(0, 240);
        throw new Error(
          `HTTP ${response.status}${detail ? `: ${detail}` : ""}`
        );
      }

      // Cria uma única mensagem para pensamento e resposta.
      setMessages([
        ...newMessages,
        { role: "assistant", text: "", thinking: "", streaming: true, model },
      ]);

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const piece = decoder.decode(value, { stream: true });
          rawResponse += piece;
          buffer += piece;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) processSseLine(line);
        }

        const decoderTail = decoder.decode();
        if (decoderTail) {
          rawResponse += decoderTail;
          buffer += decoderTail;
        }
        if (buffer) processSseLine(buffer);
        reader.releaseLock();
      } else {
        rawResponse = await response.text();
      }

      // Alguns gateways ignoram stream:true e devolvem JSON completo.
      // Fazemos fallback para a resposta final em vez de mostrar "(Sem resposta)".
      if (!sawSsePayload) {
        if (!streamNotice) {
          streamNotice = "O gateway devolveu JSON completo em vez de eventos SSE; esta resposta não pôde ser exibida token por token.";
        }
        let payload;
        try {
          payload = JSON.parse(rawResponse.trim());
        } catch {
          const preview = rawResponse.trim().replace(/\s+/g, " ").slice(0, 180);
          throw new Error(
            `A API não retornou SSE nem JSON válido (Content-Type: ${contentType}). ` +
            `Resposta recebida: ${preview || "(vazia)"}`
          );
        }
        applyPayload(payload);
      } else if (!contentType.toLowerCase().includes("text/event-stream")) {
        streamNotice =
          `O servidor enviou eventos, mas Content-Type é "${contentType}". O Cloudflare Tunnel pode bufferizar a resposta; o FreeLLMAPI deve responder com Content-Type: text/event-stream.`;
      }

      if (!fullText && !fullThinking) {
        throw new Error(
          `A API encerrou sem enviar conteúdo. Content-Type: ${contentType}. ` +
          "Confira se o endpoint /v1/chat/completions aceita stream:true."
        );
      }

      const finalTokens = usage?.total_tokens || Math.ceil((text.length + fullText.length) / 4);
      setMessages((previous) => {
        const updated = [...previous];
        for (let i = updated.length - 1; i >= 0; i -= 1) {
          if (updated[i].role === "assistant" && updated[i].streaming) {
            updated[i] = {
              ...updated[i],
              streaming: false,
              text: fullText || "(Sem resposta)",
              thinking: fullThinking,
              tokens: finalTokens,
              streamNotice,
            };
            break;
          }
        }
        return updated;
      });

      setTokensUsed((previous) => previous + finalTokens);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessages((previous) => {
        const updated = [...previous];
        let streamingIndex = -1;
        for (let i = updated.length - 1; i >= 0; i -= 1) {
          if (updated[i].role === "assistant" && updated[i].streaming) {
            streamingIndex = i;
            break;
          }
        }

        if (streamingIndex >= 0) {
          const partialText = fullText
            ? `${fullText}\n\n⚠️ Streaming interrompido: ${errorMessage}`
            : `❌ Erro: ${errorMessage}`;
          updated[streamingIndex] = {
            ...updated[streamingIndex],
            streaming: false,
            text: partialText,
            thinking: fullThinking || updated[streamingIndex].thinking,
            isError: true,
          };
        } else {
          updated.push({
            role: "assistant",
            text: `❌ Erro: ${errorMessage}`,
            isError: true,
          });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`chat-app ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Sidebar */}
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
          <button className="history-item">
            <MessageSquare size={15} />
            <span>{messages.find(m => m.role === "user")?.text?.slice(0, 20) || "Chat"}</span>
          </button>
        ) : (
          <div className="history-empty">Sem conversas</div>
        )}
        <div className="sidebar-stats">
          <TokenCounter used={tokensUsed} limit={TOKEN_LIMIT} />
        </div>
        <div className="sidebar-bottom">
          <button className={`sidebar-setting ${isConfigured() ? 'configured' : ''}`} onClick={() => setShowApiConfig(true)}>
            <Plug size={16} /> {isConfigured() ? "API ✓" : "Configurar"}
          </button>
        </div>
      </aside>

      {historyOpen && <div className="sidebar-overlay" onClick={() => setHistoryOpen(false)} />}

      {/* Main */}
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
                    <button key={m} onClick={() => { setModel(m); setModelMenuOpen(false); }}>
                      {m}{model === m && <Check size={14} />}
                    </button>
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
                  {msg.role === "assistant" && (
                    <span className="assistant-avatar"><AudioLines size={15} /></span>
                  )}
                  <div className="message-content">
                    <div className="message-label">
                      <span>{msg.role === "user" ? "Você" : "AGENT"}</span>
                      {msg.model && <span className="model-badge">{msg.model}</span>}
                      {msg.tokens > 0 && <span className="token-badge">{msg.tokens}t</span>}
                      {msg.streaming && <span className="streaming-badge">●</span>}
                    </div>

                    {msg.streaming && !msg.text && msg.thinking && (
                      <div className="streaming-thinking">
                        <div className="streaming-thinking-heading">
                          <Brain size={12} />
                          <span>Pensando</span>
                          <span className="thinking-dots-inline"><span></span><span></span><span></span></span>
                        </div>
                        <p className="thinking-preview">{msg.thinking.slice(-160)}</p>
                      </div>
                    )}

                    {msg.thinking && !msg.streaming && (
                      <details className="msg-thinking">
                        <summary><Brain size={12} /> Pensamento</summary>
                        <p>{msg.thinking}</p>
                      </details>
                    )}

                    {(msg.text || (msg.streaming && !msg.thinking)) && (
                      <p className={msg.streaming ? "streaming-text" : ""}>
                        {msg.text || " "}
                      </p>
                    )}

                    {msg.streamNotice && (
                      <p className="stream-warning">⚠️ {msg.streamNotice}</p>
                    )}
                  </div>
                </div>
              ))}

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
