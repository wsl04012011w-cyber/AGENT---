import { useState, useEffect } from "react";
import { Settings2, Key, Globe, Check, X, AlertCircle, Loader2, Cloud, Home } from "lucide-react";

// ============================================================
// CONFIGURAÇÃO FREELLMAPI
// ============================================================

const URL_PRESETS = [
  { 
    id: "local", 
    label: "Localhost", 
    url: "http://localhost:3001/v1",
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

  const [apiUrl, setApiUrl] = useState(() => 
    localStorage.getItem("freellmapi_url") || "http://localhost:3001/v1"
  );
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem("freellmapi_key") || ""
  );
  const [testStatus, setTestStatus] = useState("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const handlePresetChange = (presetId) => {
    setUrlPreset(presetId);
    const preset = URL_PRESETS.find(p => p.id === presetId);

    // Só preenche automaticamente para localhost
    if (presetId === "local") {
      setApiUrl("http://localhost:3001/v1");
    } else if (presetId === "tunnel" || presetId === "custom") {
      // Mantém a URL salva ou deixa vazio para digitar
      const saved = localStorage.getItem("freellmapi_url");
      if (presetId === "tunnel" && saved && !saved.includes("localhost")) {
        setApiUrl(saved);
      } else if (presetId === "custom" && saved) {
        setApiUrl(saved);
      } else {
        setApiUrl("");
      }
    }
  };

  const handleSave = () => {
    localStorage.setItem("freellmapi_url", apiUrl);
    localStorage.setItem("freellmapi_key", apiKey);
    localStorage.setItem("freellmapi_preset", urlPreset);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onConfigSave?.({ url: apiUrl, key: apiKey, preset: urlPreset });
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
      const response = await fetch(`${apiUrl}/models`, {
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
      const response = await fetch(`${apiUrl}/chat/completions`, {
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
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={
              urlPreset === "local" 
                ? "http://localhost:3001/v1"
                : urlPreset === "tunnel"
                ? "https://seu-tunnel.trycloudflare.com/v1"
                : "https://sua-url.com/v1"
            }
          />
          <small>
            {urlPreset === "local" && "FreeLLMAPI rodando localmente"}
            {urlPreset === "tunnel" && "Cole a URL do seu túnel Cloudflare (ex: https://xxx.trycloudflare.com/v1)"}
            {urlPreset === "custom" && "Digite sua URL personalizada"}
          </small>
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
              <li>Instale: <code>winget install cloudflare.cloudflared</code></li>
              <li>Login: <code>cloudflared login</code></li>
              <li>Rápido (sem login): <code>cloudflared tunnel --url http://localhost:3001</code></li>
              <li>Copie a URL gerada (ex: https://xxx.trycloudflare.com)</li>
              <li>Cole acima com <code>/v1</code> no final</li>
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
  const [config, setConfig] = useState(() => ({
    url: localStorage.getItem("freellmapi_url") || "http://localhost:3001/v1",
    key: localStorage.getItem("freellmapi_key") || "",
    preset: localStorage.getItem("freellmapi_preset") || "local",
  }));

  const isConfigured = () => !!config.key;

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem("freellmapi_url", newConfig.url);
    localStorage.setItem("freellmapi_key", newConfig.key);
    if (newConfig.preset) {
      localStorage.setItem("freellmapi_preset", newConfig.preset);
    }
  };

  return { config, isConfigured, updateConfig };
}

// Função para fazer chamadas à API
export async function callFreeLLMAPI(config, messages, options = {}) {
  const { model = "auto", temperature = 0.7, max_tokens, stream = false } = options;

  const response = await fetch(`${config.url}/chat/completions`, {
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
