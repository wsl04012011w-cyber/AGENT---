import { useState, useEffect } from "react";
import { Settings2, Key, Globe, Check, X, AlertCircle, Loader2, Cloud, Home, Wand2 } from "lucide-react";

// ============================================================
// CONFIGURAÇÃO FREELLMAPI
// ============================================================

const URL_PRESETS = [
  { 
    id: "local", 
    label: "Localhost", 
    url: "http://localhost:3001",
    icon: Home,
    description: "FreeLLMAPI rodando local"
  },
  { 
    id: "tunnel", 
    label: "Cloudflare Tunnel", 
    url: "",
    icon: Cloud,
    description: "Túnel Cloudflare (produção)"
  },
  { 
    id: "custom", 
    label: "Custom", 
    url: "",
    icon: Globe,
    description: "URL personalizada"
  },
];

// ============================================================
// FUNÇÃO: Normalizar URL automaticamente
// ============================================================
function normalizeApiUrl(url) {
  if (!url) return "";

  let normalized = url.trim();

  // Remove espaços
  normalized = normalized.replace(/\s/g, "");

  // Adiciona protocolo se não tiver
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized;
  }

  // Remove barra final
  normalized = normalized.replace(/\/$/, "");

  // Remove /v1 se já tiver (vamos adicionar depois)
  normalized = normalized.replace(/\/v1$/, "");

  // Adiciona /v1 no final
  normalized = normalized + "/v1";

  return normalized;
}

// ============================================================
// FUNÇÃO: Extrair URL base (sem /v1) pra exibição
// ============================================================
function getBaseUrl(url) {
  return url.replace(/\/v1$/, "");
}

export default function ApiConfig({ onConfigSave, onClose }) {
  const [urlPreset, setUrlPreset] = useState(() => {
    const saved = localStorage.getItem("freellmapi_url") || "";
    const savedPreset = localStorage.getItem("freellmapi_preset") || "";

    if (savedPreset) return savedPreset;
    if (saved.includes("localhost")) return "local";
    if (saved.includes("trycloudflare") || saved.includes("cfargotunnel") || saved.includes("cloudflare")) return "tunnel";
    if (saved) return "custom";
    return "local";
  });

  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem("freellmapi_url") || "http://localhost:3001/v1";
    return getBaseUrl(saved); // Mostra sem o /v1
  });

  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem("freellmapi_key") || ""
  );
  const [testStatus, setTestStatus] = useState("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [autoFixed, setAutoFixed] = useState(false);

  // URL final normalizada (com /v1)
  const finalUrl = normalizeApiUrl(apiUrl);

  const handlePresetChange = (presetId) => {
    setUrlPreset(presetId);

    if (presetId === "local") {
      setApiUrl("http://localhost:3001");
    } else if (presetId === "tunnel" || presetId === "custom") {
      const saved = localStorage.getItem("freellmapi_url");
      if (saved && !saved.includes("localhost")) {
        setApiUrl(getBaseUrl(saved));
      } else {
        setApiUrl("");
      }
    }
  };

  const handleUrlChange = (value) => {
    setApiUrl(value);
    setAutoFixed(false);
  };

  const handleSave = () => {
    const normalized = normalizeApiUrl(apiUrl);
    localStorage.setItem("freellmapi_url", normalized);
    localStorage.setItem("freellmapi_key", apiKey);
    localStorage.setItem("freellmapi_preset", urlPreset);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onConfigSave?.({ url: normalized, key: apiKey, preset: urlPreset });
  };

  const testConnection = async () => {
    if (!apiUrl || !apiKey) {
      setTestStatus("error");
      setTestMessage("❌ Preencha URL e API Key primeiro!");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Testando conexão...");

    try {
      const response = await fetch(`${finalUrl}/models`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = data.data?.length || 0;
        setTestStatus("success");
        setTestMessage(`✅ Conectado! ${modelCount} modelos disponíveis.`);
      } else {
        const error = await response.json().catch(() => ({}));
        setTestStatus("error");
        setTestMessage(`❌ Erro ${response.status}: ${error.error?.message || "Falha na conexão"}`);
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(`❌ Erro: ${err.message}. Verifique se o FreeLLMAPI está acessível.`);
    }
  };

  const testChat = async () => {
    if (!apiUrl || !apiKey) {
      setTestStatus("error");
      setTestMessage("❌ Preencha URL e API Key primeiro!");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Enviando mensagem de teste...");

    try {
      const response = await fetch(`${finalUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "auto",
          messages: [
            { role: "user", content: "Responda apenas: OK" }
          ],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const modelUsed = data.model || "auto";
        setTestStatus("success");
        setTestMessage(`✅ Resposta: "${content}" | Modelo: ${modelUsed}`);
      } else {
        const error = await response.json().catch(() => ({}));
        setTestStatus("error");
        setTestMessage(`❌ Erro ${response.status}: ${error.error?.message || "Falha no chat"}`);
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(`❌ Erro: ${err.message}`);
    }
  };

  return (
    <div className="api-config-panel">
      <div className="api-config-header">
        <div className="api-config-title">
          <Settings2 size={18} />
          <h3>Configurar FreeLLMAPI</h3>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="api-config-content">
        <p className="api-config-desc">
          Conecte ao FreeLLMAPI para habilitar respostas reais de IA. 
          <strong> A URL é ajustada automaticamente!</strong>
        </p>

        {/* Seleção de preset */}
        <div className="config-field">
          <label>Ambiente</label>
          <div className="preset-selector">
            {URL_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  className={`preset-btn ${urlPreset === preset.id ? 'active' : ''}`}
                  onClick={() => handlePresetChange(preset.id)}
                >
                  <Icon size={16} />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* URL */}
        <div className="config-field">
          <label>
            <Globe size={14} />
            URL do Servidor
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={
              urlPreset === "local" 
                ? "http://localhost:3001"
                : urlPreset === "tunnel"
                ? "https://xxx.trycloudflare.com"
                : "https://sua-url.com"
            }
          />
          <small>
            {urlPreset === "local" && "FreeLLMAPI rodando localmente"}
            {urlPreset === "tunnel" && "Cole a URL do seu túnel Cloudflare"}
            {urlPreset === "custom" && "Digite sua URL personalizada"}
          </small>

          {/* Preview da URL final */}
          {apiUrl && (
            <div className="url-preview">
              <Wand2 size={12} />
              <span>URL final: <code>{finalUrl}</code></span>
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="config-field">
          <label>
            <Key size={14} />
            Unified API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="freellmapi-sua-chave-aqui"
          />
          <small>Encontrada no dashboard do FreeLLMAPI (aba Keys)</small>
        </div>

        {/* Status do teste */}
        {testMessage && (
          <div className={`test-status ${testStatus}`}>
            {testStatus === "testing" && <Loader2 size={14} className="spin" />}
            {testStatus === "success" && <Check size={14} />}
            {testStatus === "error" && <AlertCircle size={14} />}
            <span>{testMessage}</span>
          </div>
        )}

        {/* Botões */}
        <div className="config-actions">
          <button 
            className="btn-secondary" 
            onClick={testConnection}
            disabled={testStatus === "testing"}
          >
            Testar Conexão
          </button>
          <button 
            className="btn-secondary" 
            onClick={testChat}
            disabled={testStatus === "testing"}
          >
            Testar Chat
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!apiUrl || !apiKey}
          >
            {saved ? <><Check size={14} /> Salvo!</> : "Salvar Configuração"}
          </button>
        </div>

        {/* Info sobre túnel */}
        {urlPreset === "tunnel" && (
          <div className="config-info tunnel-info">
            <h4>🌐 Cloudflare Tunnel</h4>
            <p>Para expor seu FreeLLMAPI local:</p>
            <ol>
              <li>Instale: <code>pkg install cloudflared</code></li>
              <li>Rode: <code>cloudflared tunnel --url http://localhost:3001</code></li>
              <li>Copie a URL gerada (ex: https://xxx.trycloudflare.com)</li>
              <li>Cole acima <strong>sem</strong> o /v1 - o app adiciona!</li>
            </ol>
          </div>
        )}

        {/* Modelos suportados */}
        <div className="config-models">
          <h4>📊 Modos de roteamento:</h4>
          <div className="routing-modes">
            <span className="mode-badge">auto</span>
            <span className="mode-badge">auto:fast</span>
            <span className="mode-badge">auto:smart</span>
            <span className="mode-badge">fusion</span>
          </div>
          <small>
            "auto" deixa o FreeLLMAPI escolher o melhor modelo disponível.
          </small>
        </div>
      </div>
    </div>
  );
}

// Hook para usar a configuração
export function useApiConfig() {
  const [config, setConfig] = useState(() => {
    const savedUrl = localStorage.getItem("freellmapi_url") || "http://localhost:3001/v1";
    return {
      url: normalizeApiUrl(savedUrl),
      key: localStorage.getItem("freellmapi_key") || "",
      preset: localStorage.getItem("freellmapi_preset") || "local",
    };
  });

  const isConfigured = () => !!config.key;

  const updateConfig = (newConfig) => {
    const normalized = {
      ...newConfig,
      url: normalizeApiUrl(newConfig.url),
    };
    setConfig(normalized);
    localStorage.setItem("freellmapi_url", normalized.url);
    localStorage.setItem("freellmapi_key", normalized.key);
    if (newConfig.preset) {
      localStorage.setItem("freellmapi_preset", newConfig.preset);
    }
  };

  return { config, isConfigured, updateConfig };
}

// Função para fazer chamadas à API
export async function callFreeLLMAPI(config, messages, options = {}) {
  const { model = "auto", temperature = 0.7, max_tokens, stream = false } = options;

  // Garante que a URL tá normalizada
  const baseUrl = normalizeApiUrl(config.url);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}
