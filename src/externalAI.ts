/**
 * External (cloud / self-hosted) AI models, used instead of the on-device WebGPU model.
 *
 * Requests run in the main process so the API key never reaches the renderer and
 * provider CORS rules don't apply. The key is encrypted with the OS keychain
 * (Electron safeStorage) and stored in userData/external-ai.json.
 */
import { app, ipcMain, safeStorage } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "./lib/logger";

const logger = createLogger("ExternalAI");

export type ExternalProvider =
  | "anthropic"
  | "openai"
  | "gemini"
  | "openrouter"
  | "groq"
  | "mistral"
  | "deepseek"
  | "xai"
  | "together"
  | "perplexity"
  | "ollama"
  | "lmstudio"
  | "custom";

interface ProviderInfo {
  baseUrl: string;
  /** Whether the user may point this provider at a different URL */
  editableUrl: boolean;
  needsKey: boolean;
}

// Every provider except Anthropic speaks the OpenAI chat-completions format at `baseUrl`.
// Hosted URLs are fixed so a saved key can only ever be sent to its own provider.
export const PROVIDERS: Record<ExternalProvider, ProviderInfo> = {
  anthropic: { baseUrl: "https://api.anthropic.com", editableUrl: false, needsKey: true },
  openai: { baseUrl: "https://api.openai.com/v1", editableUrl: false, needsKey: true },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", editableUrl: false, needsKey: true },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", editableUrl: false, needsKey: true },
  groq: { baseUrl: "https://api.groq.com/openai/v1", editableUrl: false, needsKey: true },
  mistral: { baseUrl: "https://api.mistral.ai/v1", editableUrl: false, needsKey: true },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", editableUrl: false, needsKey: true },
  xai: { baseUrl: "https://api.x.ai/v1", editableUrl: false, needsKey: true },
  together: { baseUrl: "https://api.together.xyz/v1", editableUrl: false, needsKey: true },
  perplexity: { baseUrl: "https://api.perplexity.ai", editableUrl: false, needsKey: true },
  ollama: { baseUrl: "http://localhost:11434/v1", editableUrl: true, needsKey: false },
  lmstudio: { baseUrl: "http://localhost:1234/v1", editableUrl: true, needsKey: false },
  custom: { baseUrl: "", editableUrl: true, needsKey: false },
};

// Claude models that support server-side refusal fallbacks (`fallbacks: "default"`)
const CLAUDE_FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_TOKENS = 16_000;

interface StoredConfig {
  provider: ExternalProvider;
  baseUrl: string;
  model: string;
  /** base64 of safeStorage-encrypted API key */
  encryptedKey?: string;
}

/** What the renderer is allowed to see: never the key itself */
export interface PublicConfig {
  provider: ExternalProvider;
  baseUrl: string;
  model: string;
  hasKey: boolean;
  configured: boolean;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const configPath = () => path.join(app.getPath("userData"), "external-ai.json");

async function readConfig(): Promise<StoredConfig | null> {
  try {
    return JSON.parse(await fs.readFile(configPath(), "utf8"));
  } catch {
    return null;
  }
}

async function writeConfig(config: StoredConfig | null) {
  if (!config) {
    await fs.rm(configPath(), { force: true });
    return;
  }
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 });
}

function decryptKey(config: StoredConfig): string | null {
  if (!config.encryptedKey) return null;
  try {
    return safeStorage.decryptString(Buffer.from(config.encryptedKey, "base64"));
  } catch (err) {
    logger.error(`Could not decrypt stored API key: ${err}`);
    return null;
  }
}

function toPublic(config: StoredConfig | null): PublicConfig | null {
  if (!config) return null;
  const info = PROVIDERS[config.provider];
  const hasKey = !!config.encryptedKey;
  return {
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
    hasKey,
    configured: !!config.model && !!config.baseUrl && (!info.needsKey || hasKey),
  };
}

/**
 * Only https endpoints, or plain http to this machine (Ollama, LM Studio), so an
 * API key is never sent unencrypted over the network.
 */
export function validateBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a full URL, e.g. https://api.example.com/v1");
  }
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error("Use an https:// URL (plain http is only allowed for localhost)");
  }
  return url.toString().replace(/\/+$/, "");
}

function sanitizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("No messages to send");
  return messages.map((m: any) => {
    if (!["system", "user", "assistant"].includes(m?.role) || typeof m?.content !== "string") {
      throw new Error("Invalid chat message");
    }
    return { role: m.role, content: m.content };
  });
}

async function chatAnthropic(config: StoredConfig, apiKey: string, messages: ChatMessage[], signal: AbortSignal) {
  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const turns = messages.filter((m) => m.role !== "system") as Anthropic.Beta.BetaMessageParam[];
  // `temperature` is not sent: current Claude models reject sampling parameters.
  const response = await client.beta.messages.create(
    {
      model: config.model,
      max_tokens: MAX_TOKENS,
      ...(system ? { system } : {}),
      messages: turns,
      ...(CLAUDE_FALLBACK_MODELS.has(config.model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    },
    { signal },
  );
  if (response.stop_reason === "refusal") {
    throw new Error("The model declined this request.");
  }
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function chatOpenAICompatible(
  config: StoredConfig,
  apiKey: string | null,
  messages: ChatMessage[],
  temperature: number | undefined,
  signal: AbortSignal,
) {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      ...(typeof temperature === "number" ? { temperature } : {}),
    }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
  });
  const body: any = await res.json().catch((): null => null);
  if (!res.ok) {
    const detail = body?.error?.message || body?.message || res.statusText;
    throw new Error(`${res.status === 401 ? "Invalid API key" : `Request failed (${res.status})`}: ${detail}`);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("The provider returned an unexpected response");
  return content;
}

export async function runExternalChat(messagesInput: unknown, temperature: number | undefined, signal: AbortSignal) {
  const config = await readConfig();
  const pub = toPublic(config);
  if (!config || !pub?.configured) throw new Error("External AI model is not set up yet");
  const messages = sanitizeMessages(messagesInput);
  const apiKey = decryptKey(config);
  if (PROVIDERS[config.provider].needsKey && !apiKey) throw new Error("API key is missing. Add it again in the AI model menu.");

  return config.provider === "anthropic"
    ? chatAnthropic(config, apiKey!, messages, signal)
    : chatOpenAICompatible(config, apiKey, messages, temperature, signal);
}

const MAX_LISTED_MODELS = 300;

/**
 * Model ids the provider offers to this key, so the user can pick instead of typing.
 * Uses the key being typed, or the saved one for the same provider.
 */
export async function listProviderModels(input: { provider: ExternalProvider; baseUrl?: string; apiKey?: string }) {
  const info = PROVIDERS[input?.provider];
  if (!info) throw new Error("Unknown provider");
  const baseUrl = validateBaseUrl(info.editableUrl ? input.baseUrl || info.baseUrl : info.baseUrl);

  const saved = await readConfig();
  const apiKey = input.apiKey?.trim() || (saved?.provider === input.provider ? decryptKey(saved) : null);
  if (info.needsKey && !apiKey) throw new Error("Add your API key to see the available models");

  let ids: string[] = [];
  if (input.provider === "anthropic") {
    const client = new Anthropic({ apiKey: apiKey!, timeout: 15_000 });
    for await (const model of client.models.list()) {
      ids.push(model.id);
      if (ids.length >= MAX_LISTED_MODELS) break;
    }
  } else {
    const res = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(res.status === 401 ? "Invalid API key" : `Could not load models (${res.status})`);
    const body: any = await res.json();
    const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
    // Gemini's OpenAI endpoint returns ids prefixed with "models/"
    ids = list
      .map((m: any) => String(m?.id || "").replace(/^models\//, ""))
      .filter(Boolean)
      .slice(0, MAX_LISTED_MODELS)
      .sort();
  }
  return ids;
}

const inflight = new Map<string, AbortController>();

export function registerExternalAIHandlers() {
  ipcMain.handle("external-ai:get-config", async () => toPublic(await readConfig()));

  ipcMain.handle(
    "external-ai:save-config",
    async (_event, input: { provider: ExternalProvider; model: string; baseUrl?: string; apiKey?: string | null }) => {
      const info = PROVIDERS[input?.provider];
      if (!info) throw new Error("Unknown provider");
      const model = String(input.model || "").trim();
      if (!model) throw new Error("Enter a model name");

      const previous = await readConfig();
      const baseUrl = validateBaseUrl(info.editableUrl ? input.baseUrl || info.baseUrl : info.baseUrl);

      // apiKey: string = replace, null = remove, undefined = keep (same provider only)
      let encryptedKey = previous?.provider === input.provider ? previous.encryptedKey : undefined;
      if (input.apiKey === null) encryptedKey = undefined;
      if (typeof input.apiKey === "string" && input.apiKey.trim()) {
        if (!safeStorage.isEncryptionAvailable()) {
          throw new Error("Secure key storage is not available on this system, so the key was not saved");
        }
        encryptedKey = safeStorage.encryptString(input.apiKey.trim()).toString("base64");
      }

      await writeConfig({ provider: input.provider, baseUrl, model, encryptedKey });
      logger.info(`External AI configured: ${input.provider} / ${model}`);
      return toPublic(await readConfig());
    },
  );

  ipcMain.handle(
    "external-ai:list-models",
    async (_event, input: { provider: ExternalProvider; baseUrl?: string; apiKey?: string }) => listProviderModels(input),
  );

  ipcMain.handle("external-ai:clear-config", async () => {
    await writeConfig(null);
    return null;
  });

  ipcMain.handle("external-ai:chat", async (_event, req: { requestId: string; messages: unknown; temperature?: number }) => {
    const controller = new AbortController();
    inflight.set(req.requestId, controller);
    try {
      return { content: await runExternalChat(req.messages, req.temperature, controller.signal) };
    } catch (err: any) {
      if (controller.signal.aborted) return { aborted: true };
      logger.warn(`External AI request failed: ${err?.message || err}`);
      return { error: err?.message || "Request failed" };
    } finally {
      inflight.delete(req.requestId);
    }
  });

  ipcMain.handle("external-ai:abort", (_event, requestId?: string) => {
    for (const [id, controller] of inflight) {
      if (!requestId || id === requestId) controller.abort();
    }
  });
}
