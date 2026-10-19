// ============================================================
// CONFIGURAÇÃO DE MODELOS - AGENT---
// Sistema de roteamento e fallback
// Gerado automaticamente com base nos modelos disponíveis
// ============================================================

export const modelProviders = {
  xKiro: { name: "xKiro", color: "#b5a1ff" },
  google: { name: "Google AI Studio", color: "#8ee2c5" },
  groq: { name: "Groq", color: "#ffb86b" },
  cf: { name: "Cloudflare", color: "#7dcfff" },
  free: { name: "Free", color: "#ff8ab3" },
};

// ============================================================
// TABELA DE ROTEAMENTO POR TAREFA
// ============================================================

export const routingTable = {
  chat_simples: {
    description: "Conversas casuais, perguntas rápidas",
    icon: "💬",
    models: [
      { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "google", quota: "3M", reason: "Mais rápido" },
      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", provider: "google", quota: "3M", reason: "Ainda mais rápido" },
      { id: "sensenova-6.8-flash", name: "SenseNova 6.8 Flash-Lite", provider: "xKiro", quota: "15M", reason: "Barato" },
      { id: "glm-4.7-flash", name: "GLM-4.7 Flash", provider: "cf", quota: "45M", reason: "Nunca acaba" },
    ],
  },

  codigo_geral: {
    description: "Escrever, revisar, explicar código",
    icon: "💻",
    models: [
      { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus", provider: "xKiro", quota: "30M", reason: "🏆 Especialista" },
      { id: "devstral-2", name: "Devstral 2", provider: "xKiro", quota: "15M", reason: "🏆 Dev" },
      { id: "codestral", name: "Codestral", provider: "xKiro", quota: "15M", reason: "🏆 Código" },
      { id: "qwen2.5-coder-32b", name: "Qwen2.5 Coder 32B", provider: "cf", quota: "20M", reason: "Código" },
      { id: "north-mini-code", name: "North Mini Code", provider: "free", quota: "6M", reason: "Leve" },
    ],
  },

  codigo_pesado: {
    description: "Arquitetura, debug complexo, refatoração",
    icon: "🔧",
    models: [
      { id: "qwen3.8-max", name: "Qwen3.8 Max", provider: "xKiro", quota: "30M", reason: "Máxima qualidade" },
      { id: "qwen3.5-397b", name: "Qwen3.5 397B A17B", provider: "xKiro", quota: "30M", reason: "Modelo MASSIVO" },
      { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus", provider: "xKiro", quota: "30M", reason: "Especialista" },
      { id: "gpt-oss-120b", name: "GPT-OSS 120B", provider: "cf", quota: "45M", reason: "Open-source" },
    ],
  },

  analise_complexa: {
    description: "Análise profunda, raciocínio, decisões",
    icon: "🧠",
    models: [
      { id: "qwen3.8-max", name: "Qwen3.8 Max", provider: "xKiro", quota: "30M", reason: "Top qualidade" },
      { id: "qwen3.5-397b", name: "Qwen3.5 397B A17B", provider: "xKiro", quota: "30M", reason: "397B params" },
      { id: "qwq-32b", name: "QwQ 32B", provider: "cf", quota: "20M", reason: "Raciocínio" },
      { id: "deepseek-r1-32b", name: "DeepSeek R1 Distill Qwen 32B", provider: "cf", quota: "5M", reason: "Raciocínio barato" },
    ],
  },

  resumo_rapido: {
    description: "TL;DR, resumos, extrair info",
    icon: "⚡",
    models: [
      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", provider: "google", quota: "3M", reason: "Mais rápido" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", provider: "google", quota: "3M", reason: "Rápido" },
      { id: "sensenova-6.8-flash", name: "SenseNova 6.8 Flash-Lite", provider: "xKiro", quota: "15M", reason: "Barato" },
      { id: "ministral-3-3b", name: "Ministral 3 3B", provider: "xKiro", quota: "15M", reason: "Muito leve" },
    ],
  },

  criatividade: {
    description: "Brainstorm, ideias, escrita criativa",
    icon: "✨",
    models: [
      { id: "mistral-large-3", name: "Mistral Large 3", provider: "xKiro", quota: "15M", reason: "Alta qualidade" },
      { id: "qwen3.7-plus", name: "Qwen3.7 Plus", provider: "xKiro", quota: "30M", reason: "Criativo" },
      { id: "mistral-medium-3.5", name: "Mistral Medium 3.5", provider: "xKiro", quota: "15M", reason: "Bom texto" },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "cf", quota: "45M", reason: "Meta" },
    ],
  },

  visao_imagem: {
    description: "Analisar imagens, OCR, descrição",
    icon: "👁️",
    models: [
      { id: "qwen3-vl-plus", name: "Qwen3 VL Plus", provider: "xKiro", quota: "30M", reason: "🏆 Visão" },
      { id: "llama-3.2-11b-vision", name: "Llama 3.2 11B Vision", provider: "cf", quota: "20M", reason: "Visão Meta" },
      { id: "moondream-3.1", name: "Moondream 3.1 9B", provider: "cf", quota: "20M", reason: "Visão leve" },
    ],
  },

  seguranca: {
    description: "Moderação, análise de risco",
    icon: "🛡️",
    models: [
      { id: "gpt-oss-safeguard", name: "GPT-OSS Safeguard 20B", provider: "groq", quota: "6M", reason: "🏆 Segurança" },
      { id: "llama-guard-3", name: "Llama Guard 3 8B", provider: "cf", quota: "20M", reason: "Moderação" },
    ],
  },

  fallback_geral: {
    description: "Quando tudo falha",
    icon: "🆘",
    models: [
      { id: "glm-4.7-flash", name: "GLM-4.7 Flash", provider: "cf", quota: "45M", reason: "Sempre disponível" },
      { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "google", quota: "3M", reason: "Google estável" },
      { id: "qwen3.5-flash", name: "Qwen3.5 Flash", provider: "xKiro", quota: "30M", reason: "Confiável" },
    ],
  },
};

// ============================================================
// MAPEAMENTO DE SKILLS → TAREFAS
// ============================================================

export const skillToTaskMapping = {
  "task-planner": "analise_complexa",
  "decision-helper": "analise_complexa",
  "memory-manager": "resumo_rapido",
  "code-reviewer": "codigo_geral",
  "debugger": "codigo_pesado",
  "architect": "codigo_pesado",
  "git-helper": "codigo_geral",
  "web-researcher": "analise_complexa",
  "data-analyst": "analise_complexa",
  "document-analyzer": "resumo_rapido",
  "brainstormer": "criatividade",
  "writer": "criatividade",
  "storyteller": "criatividade",
  "communicator": "chat_simples",
  "mentor": "chat_simples",
  "fast-responder": "resumo_rapido",
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// Retorna fila de modelos para uma tarefa
export function getModelQueue(taskType) {
  const task = routingTable[taskType];
  return task ? task.models : routingTable.fallback_geral.models;
}

// Retorna próximo modelo disponível na fila
export function getNextModel(taskType, failedModels = []) {
  const queue = getModelQueue(taskType);
  return queue.find((m) => !failedModels.includes(m.id)) || queue[0];
}

// Classifica mensagem em tipo de tarefa
export function classifyTask(message, selectedSkill = null) {
  // Se tem skill selecionada, usa o mapeamento
  if (selectedSkill && skillToTaskMapping[selectedSkill]) {
    return skillToTaskMapping[selectedSkill];
  }

  const msg = message.toLowerCase();

  // Palavras-chave para classificação
  const keywords = {
    codigo_geral: ["código", "code", "função", "script", "programa", "bug", "erro", "debug"],
    codigo_pesado: ["arquitetura", "refatorar", "otimizar", "performance", "escalabilidade"],
    analise_complexa: ["analisar", "análise", "decidir", "decisão", "comparar", "avaliar", "planejar"],
    resumo_rapido: ["resumir", "resumo", "tl;dr", "simplificar", "extrair"],
    criatividade: ["ideia", "criar", "escrever", "história", "brainstorm", "nome"],
    visao_imagem: ["imagem", "foto", "analisar imagem", "ocr"],
  };

  // Conta matches para cada categoria
  const scores = {};
  for (const [task, words] of Object.entries(keywords)) {
    scores[task] = words.filter((w) => msg.includes(w)).length;
  }

  // Retorna categoria com mais matches
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "chat_simples";
}

// Estatísticas do sistema
export function getRoutingStats() {
  const stats = {
    totalTasks: Object.keys(routingTable).length,
    totalModels: 0,
    byProvider: {},
  };

  for (const task of Object.values(routingTable)) {
    stats.totalModels += task.models.length;
    for (const model of task.models) {
      stats.byProvider[model.provider] = (stats.byProvider[model.provider] || 0) + 1;
    }
  }

  return stats;
}

export default {
  modelProviders,
  routingTable,
  skillToTaskMapping,
  getModelQueue,
  getNextModel,
  classifyTask,
  getRoutingStats,
};
