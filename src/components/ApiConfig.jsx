import { useState, useEffect } from "react";
import { Settings2, Key, Globe, Check, X, AlertCircle, Loader2 } from "lucide-react";

// ============================================================
// CONFIGURAÇÃO FREELLMAPI
// ============================================================

const DEFAULT_URL = "http://localhost:3001/v1";

export default function ApiConfig({ onConfigSave, onClose }) {
  const [apiUrl, setApiUrl] = useState(() => 
    localStorage.getItem("freellmapi_url") || DEFAULT_URL
  );
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem("freellmapi_key") || ""
  );
  const [testStatus, setTestStatus] = useState("idle"); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);

  // Salvar configuração
  const handleSave = () => {
    localStorage.setItem("freellmapi_url", apiUrl);
    localStorage.setItem("freellmapi_key", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onConfigSave?.({ url: apiUrl, key: apiKey });
  };

  // Testar conexão
  const testConnection = async () => {
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
      setTestMessage(`❌ Erro: ${err.message}. Verifique se o FreeLLMAPI está rodando.`);
    }
  };

  // Teste rápido de chat
  const testChat = async () => {
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
        const routedVia = response.headers.get("x-routed-via") || "desconhecido";
        setTestStatus("success");
        setTestMessage(`✅ Resposta: "${content}" | Via: ${routedVia}`);
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
          Conecte ao seu servidor FreeLLMAPI local para habilitar respostas reais de IA.
        </p>

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
            placeholder="http://localhost:3001/v1"
          />
          <small>Padrão: http://localhost:3001/v1</small>
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
            disabled={testStatus === "testing" || !apiUrl || !apiKey}
          >
            Testar Conexão
          </button>
          <button 
            className="btn-secondary" 
            onClick={testChat}
            disabled={testStatus === "testing" || !apiUrl || !apiKey}
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

        {/* Info */}
        <div className="config-info">
          <h4>🚀 Como usar:</h4>
          <ol>
            <li>Instale o FreeLLMAPI: <code>curl -fsSL https://freellmapi.co/install.sh | bash</code></li>
            <li>Abra o dashboard: <code>http://localhost:3001</code></li>
            <li>Adicione suas provider keys (Google, Groq, etc)</li>
            <li>Copie a <strong>Unified API Key</strong> da aba Keys</li>
            <li>Cole aqui e teste!</li>
          </ol>
        </div>

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
    url: localStorage.getItem("freellmapi_url") || DEFAULT_URL,
    key: localStorage.getItem("freellmapi_key") || "",
  }));

  const isConfigured = () => !!config.key;

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem("freellmapi_url", newConfig.url);
    localStorage.setItem("freellmapi_key", newConfig.key);
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
