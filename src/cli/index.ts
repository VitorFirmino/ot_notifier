#!/usr/bin/env node
import { createInterface } from "readline/promises";
import { stdout, stdin } from "process";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVERS_JSON = resolve(__dirname, "../infrastructure/storage/servers.json");
const DATA_DIR = resolve(__dirname, "../infrastructure/storage/data");

interface ServerEntry {
  id?: string;
  url: string;
  name: string;
  enabled: boolean;
  webhookUrl?: string;
}

interface ServerJson {
  serverId: string;
  serverName: string;
  guild: {
    url: string;
    webhookUrl?: string;
    enabled?: boolean;
  };
  characters?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  isWorking?: boolean;
  lastUpdate?: string;
}

const loadServers = (): ServerEntry[] => {
  if (!existsSync(SERVERS_JSON)) return [];
  try {
    return JSON.parse(readFileSync(SERVERS_JSON, "utf-8")) as ServerEntry[];
  } catch (err: unknown) {
    return [];
  }
};

const saveServers = (servers: ServerEntry[]): void => {
  mkdirSync(dirname(SERVERS_JSON), { recursive: true });
  writeFileSync(SERVERS_JSON, JSON.stringify(servers, null, 2) + "\n", "utf-8");
};

const loadServerJson = (serverId: string): ServerJson | null => {
  const path = resolve(DATA_DIR, `${serverId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ServerJson;
  } catch (err: unknown) {
    return null;
  }
};

const saveServerJson = (config: ServerJson): void => {
  mkdirSync(DATA_DIR, { recursive: true });
  const path = resolve(DATA_DIR, `${config.serverId}.json`);
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf-8");
};

const extractServerId = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const parts = hostname.split(".");

    if (hostname.includes("otdbo.com.br")) {
      const guild = parsedUrl.searchParams.get("GuildName") || parsedUrl.searchParams.get("guildname");
      if (guild) {
        const slug = guild
          .replace(/\+/g, " ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        if (slug) return `otdbo_${slug}`;
      }
    }

    return parts[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
  } catch (err: unknown) {
    return "unknown";
  }
};

const getWebhookForServer = (entry: ServerEntry): string | null => {
  if (entry.webhookUrl) return entry.webhookUrl;

  const serverId = entry.id || extractServerId(entry.url);

  const serverJson = loadServerJson(serverId);
  if (serverJson?.guild?.webhookUrl) return serverJson.guild.webhookUrl;

  const normalizedId = serverId.toUpperCase();
  const exactKey = `WEBHOOK_URL_${normalizedId}`;
  if (process.env[exactKey]) return `${process.env[exactKey]} (.env)`;

  const parts = normalizedId.split("_");
  for (let prefixLength = parts.length - 1; prefixLength > 0; prefixLength--) {
    const groupKey = `WEBHOOK_URL_${parts.slice(0, prefixLength).join("_")}`;
    if (process.env[groupKey]) return `${process.env[groupKey]} (.env)`;
  }

  if (process.env.WEBHOOK_URL) return `${process.env.WEBHOOK_URL} (.env global)`;

  return null;
};

const getCharacterCount = (serverId: string): number => {
  const config = loadServerJson(serverId);
  return Object.keys(config?.characters ?? {}).length;
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith("http");
  } catch (err: unknown) {
    return false;
  }
};

const isDiscordWebhook = (url: string): boolean =>
  url.includes("discord.com/api/webhooks/") || url.includes("discordapp.com/api/webhooks/");

const maskUrl = (url: string): string => {
  if (url.length <= 40) return url;
  return url.slice(0, 30) + "…" + url.slice(-10);
};

const rl = createInterface({ input: stdin, output: stdout });

const ask = async (question: string, defaultValue?: string): Promise<string> => {
  const hint = defaultValue ? chalk.gray(` [${defaultValue}]`) : "";
  const answer = await rl.question(`  ${chalk.cyan("?")} ${question}${hint}: `);
  return answer.trim() || defaultValue || "";
};

const askYN = async (question: string, defaultYes = true): Promise<boolean> => {
  const hint = defaultYes ? "S/n" : "s/N";
  const answer = await ask(`${question} (${hint})`);
  if (!answer) return defaultYes;
  return ["s", "sim", "y", "yes"].includes(answer.toLowerCase());
};

const clear = (): void => {
  stdout.write("\x1b[2J\x1b[H");
};

const printHeader = (): void => {
  const titleGradient = gradient(["#06B6D4", "#0EA5E9", "#14B8A6", "#F59E0B"]);
  const title = titleGradient("⚔  OT Notifier — Gerenciador");
  console.log(
    boxen(title, {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      borderColor: "cyan",
      borderStyle: "round",
    })
  );
  console.log();
};

const success = (msg: string): void => console.log(`  ${chalk.green("✓")} ${msg}`);
const error = (msg: string): void => console.log(`  ${chalk.red("✗")} ${msg}`);
const info = (msg: string): void => console.log(`  ${chalk.blue("ℹ")} ${msg}`);
const warn = (msg: string): void => console.log(`  ${chalk.yellow("⚠")} ${msg}`);

const listServers = (): void => {
  const servers = loadServers();

  if (servers.length === 0) {
    warn("Nenhum servidor configurado ainda.");
    info("Use a opção 'Adicionar servidor' para começar.");
    return;
  }

  const rows = servers.map((server, serverIndex) => {
    const serverId = server.id || extractServerId(server.url);
    const charCount = getCharacterCount(serverId);
    const webhook = getWebhookForServer(server);
    const statusIcon = server.enabled ? chalk.green("●") : chalk.red("○");
    const webhookStatus = webhook
      ? chalk.green("✓ Configurado")
      : chalk.red("✗ Sem webhook");
    const charText = charCount > 0 ? chalk.cyan(`${charCount} chars`) : chalk.gray("sem chars");
    const num = chalk.gray(`${String(serverIndex + 1).padStart(2)}.`);
    const name = server.enabled ? chalk.white(server.name) : chalk.gray(server.name);

    return `${num} ${statusIcon} ${name.padEnd(32)} ${webhookStatus.padEnd(22)} ${charText}`;
  });

  console.log(
    boxen(rows.join("\n"), {
      title: chalk.bold.cyan(` SERVIDORES (${servers.length}) `),
      borderColor: "cyan",
      borderStyle: "round",
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
    })
  );
};

const addServer = async (): Promise<void> => {
  console.log(chalk.bold("\n  Adicionar novo servidor\n"));

  const name = await ask("Nome do servidor");
  if (!name) {
    error("Nome é obrigatório.");
    return;
  }

  const url = await ask("URL da guild (ex: https://servidor.com/guilds/1)");
  if (!url || !isValidUrl(url)) {
    error("URL inválida.");
    return;
  }

  const suggestedId = extractServerId(url);
  const id = await ask("ID do servidor (slug)", suggestedId);

  const webhookUrl = await ask("URL do webhook Discord (deixe em branco para configurar depois)");
  if (webhookUrl && !isDiscordWebhook(webhookUrl)) {
    warn("URL não parece ser um webhook Discord. Continuando mesmo assim...");
  }

  const servers = loadServers();
  const existingIndex = servers.findIndex((server) => (server.id || extractServerId(server.url)) === id);

  if (existingIndex !== -1) {
    const overwrite = await askYN(`Servidor '${id}' já existe. Atualizar?`);
    if (!overwrite) {
      info("Operação cancelada.");
      return;
    }
    servers[existingIndex] = {
      ...servers[existingIndex],
      name,
      url,
      id,
      ...(webhookUrl ? { webhookUrl } : {}),
    };
  } else {
    const entry: ServerEntry = { id, name, url, enabled: true };
    if (webhookUrl) entry.webhookUrl = webhookUrl;
    servers.push(entry);
  }

  saveServers(servers);

  const existingJson = loadServerJson(id);
  const serverJson: ServerJson = {
    serverId: id,
    serverName: name,
    guild: {
      url,
      enabled: true,
      ...(webhookUrl ? { webhookUrl } : existingJson?.guild?.webhookUrl ? { webhookUrl: existingJson.guild.webhookUrl } : {}),
    },
    characters: existingJson?.characters ?? {},
    ...(existingJson?.settings ? { settings: existingJson.settings } : {}),
  };
  saveServerJson(serverJson);

  success(`Servidor '${chalk.bold(name)}' adicionado com ID: ${chalk.cyan(id)}`);
  if (!webhookUrl) {
    info("Configure o webhook depois usando a opção 'Configurar webhook'.");
  }
};

const configureWebhook = async (): Promise<void> => {
  const servers = loadServers();
  if (servers.length === 0) {
    warn("Nenhum servidor configurado.");
    return;
  }

  console.log(chalk.bold("\n  Configurar webhook\n"));
  listServers();
  console.log();

  const input = await ask("Número do servidor");
  const index = parseInt(input) - 1;

  if (isNaN(index) || index < 0 || index >= servers.length) {
    error("Número inválido.");
    return;
  }

  const server = servers[index];
  const serverId = server.id || extractServerId(server.url);
  const currentWebhook = getWebhookForServer(server);

  console.log();
  if (currentWebhook) {
    info(`Webhook atual: ${chalk.gray(maskUrl(currentWebhook))}`);
  } else {
    warn("Nenhum webhook configurado para este servidor.");
  }
  console.log();

  const webhookUrl = await ask("Nova URL do webhook Discord");

  if (!webhookUrl) {
    info("Nenhuma alteração feita.");
    return;
  }

  if (!isDiscordWebhook(webhookUrl)) {
    const proceed = await askYN("URL não parece ser um webhook Discord. Continuar mesmo assim?", false);
    if (!proceed) return;
  }

  servers[index] = { ...server, webhookUrl };
  saveServers(servers);

  const serverJson = loadServerJson(serverId);
  if (serverJson) {
    serverJson.guild.webhookUrl = webhookUrl;
    saveServerJson(serverJson);
  } else {
    saveServerJson({
      serverId,
      serverName: server.name,
      guild: { url: server.url, webhookUrl, enabled: server.enabled },
      characters: {},
    });
  }

  success(`Webhook configurado para ${chalk.bold(server.name)}`);
};

const testWebhook = async (): Promise<void> => {
  const servers = loadServers();
  if (servers.length === 0) {
    warn("Nenhum servidor configurado.");
    return;
  }

  console.log(chalk.bold("\n  Testar webhook\n"));
  listServers();
  console.log();

  const input = await ask("Número do servidor (ou 0 para URL manual)");
  const index = parseInt(input) - 1;

  let webhookUrl: string;

  if (input === "0") {
    const manual = await ask("URL do webhook Discord");
    if (!manual || !isDiscordWebhook(manual)) {
      error("URL inválida.");
      return;
    }
    webhookUrl = manual;
  } else {
    if (isNaN(index) || index < 0 || index >= servers.length) {
      error("Número inválido.");
      return;
    }

    const server = servers[index];
    const found = getWebhookForServer(server);

    if (!found || found.endsWith("(.env)")) {
      const clean = found?.replace(" (.env)", "") ?? "";
      if (!clean) {
        error(`Nenhum webhook configurado para '${server.name}'.`);
        info("Use 'Configurar webhook' antes de testar.");
        return;
      }
      webhookUrl = clean;
    } else {
      webhookUrl = found;
    }

    info(`Testando webhook de ${chalk.bold(server.name)}...`);
  }

  try {
    info("Enviando mensagem de teste...");
    await axios.post(
      webhookUrl,
      {
        content: `🔔 **OT Notifier** — Teste de webhook\n✅ Webhook configurado e funcionando!\n📅 \`${new Date().toLocaleString("pt-BR")}\``,
      },
      { timeout: 10000 }
    );
    success("Webhook funcionando! Verifique o canal Discord.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error(`Falha ao enviar webhook: ${msg}`);
  }
};

const toggleServer = async (): Promise<void> => {
  const servers = loadServers();
  if (servers.length === 0) {
    warn("Nenhum servidor configurado.");
    return;
  }

  console.log(chalk.bold("\n  Ativar/Desativar servidor\n"));
  listServers();
  console.log();

  const input = await ask("Número do servidor");
  const index = parseInt(input) - 1;

  if (isNaN(index) || index < 0 || index >= servers.length) {
    error("Número inválido.");
    return;
  }

  const server = servers[index];
  const newState = !server.enabled;
  servers[index] = { ...server, enabled: newState };
  saveServers(servers);

  const serverId = server.id || extractServerId(server.url);
  const serverJson = loadServerJson(serverId);
  if (serverJson) {
    serverJson.guild.enabled = newState;
    saveServerJson(serverJson);
  }

  const stateLabel = newState ? chalk.green("ATIVO") : chalk.red("INATIVO");
  success(`Servidor '${chalk.bold(server.name)}' agora está ${stateLabel}`);
};

const removeServer = async (): Promise<void> => {
  const servers = loadServers();
  if (servers.length === 0) {
    warn("Nenhum servidor configurado.");
    return;
  }

  console.log(chalk.bold("\n  Remover servidor\n"));
  listServers();
  console.log();
  warn("Esta ação remove o servidor da lista de monitoramento.");
  info("Os dados históricos (personagens, níveis) não são apagados.");
  console.log();

  const input = await ask("Número do servidor para remover (0 para cancelar)");
  if (input === "0" || !input) {
    info("Operação cancelada.");
    return;
  }

  const index = parseInt(input) - 1;
  if (isNaN(index) || index < 0 || index >= servers.length) {
    error("Número inválido.");
    return;
  }

  const server = servers[index];
  const confirm = await askYN(`Confirmar remoção de '${chalk.bold(server.name)}'?`, false);

  if (!confirm) {
    info("Operação cancelada.");
    return;
  }

  servers.splice(index, 1);
  saveServers(servers);

  success(`Servidor '${chalk.bold(server.name)}' removido do monitoramento.`);
};

const showDetails = async (): Promise<void> => {
  const servers = loadServers();
  if (servers.length === 0) {
    warn("Nenhum servidor configurado.");
    return;
  }

  console.log(chalk.bold("\n  Detalhes do servidor\n"));
  listServers();
  console.log();

  const input = await ask("Número do servidor");
  const index = parseInt(input) - 1;

  if (isNaN(index) || index < 0 || index >= servers.length) {
    error("Número inválido.");
    return;
  }

  const server = servers[index];
  const serverId = server.id || extractServerId(server.url);
  const serverJson = loadServerJson(serverId);
  const webhook = getWebhookForServer(server);
  const charCount = Object.keys(serverJson?.characters ?? {}).length;
  const trackedCount = Object.values(serverJson?.characters ?? {}).filter(
    (character: unknown) => (character as { last_level: number | null }).last_level !== null
  ).length;

  const lines = [
    `${chalk.gray("Nome:")}          ${chalk.white(server.name)}`,
    `${chalk.gray("ID:")}            ${chalk.cyan(serverId)}`,
    `${chalk.gray("Status:")}        ${server.enabled ? chalk.green("Ativo") : chalk.red("Inativo")}`,
    `${chalk.gray("URL da Guild:")}  ${chalk.blue(server.url)}`,
    `${chalk.gray("Webhook:")}       ${webhook ? chalk.green(maskUrl(webhook)) : chalk.red("Não configurado")}`,
    `${chalk.gray("Personagens:")}   ${chalk.white(String(charCount))} total, ${chalk.cyan(String(trackedCount))} monitorados`,
    serverJson?.isWorking !== undefined
      ? `${chalk.gray("Funcionando:")}  ${serverJson.isWorking ? chalk.green("Sim") : chalk.red("Não")}`
      : "",
    serverJson?.lastUpdate
      ? `${chalk.gray("Último update:")} ${chalk.gray(new Date(serverJson.lastUpdate).toLocaleString("pt-BR"))}`
      : "",
  ].filter(Boolean);

  console.log(
    boxen(lines.join("\n"), {
      title: chalk.bold.white(` ${server.name} `),
      borderColor: server.enabled ? "green" : "red",
      borderStyle: "round",
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
    })
  );
};

type MenuAction = () => Promise<void>;

const MENU_ITEMS: Array<{ label: string; action: MenuAction }> = [
  { label: "Listar servidores", action: async () => { listServers(); } },
  { label: "Ver detalhes de um servidor", action: showDetails },
  { label: "Adicionar servidor", action: addServer },
  { label: "Configurar webhook", action: configureWebhook },
  { label: "Testar webhook", action: testWebhook },
  { label: "Ativar / Desativar servidor", action: toggleServer },
  { label: "Remover servidor", action: removeServer },
];

const printMenu = (): void => {
  const items = MENU_ITEMS.map((item, itemIndex) =>
    `  ${chalk.cyan(`${itemIndex + 1}.`)} ${item.label}`
  ).join("\n");

  console.log(
    boxen(items, {
      title: chalk.bold(" Menu "),
      borderColor: "blue",
      borderStyle: "round",
      padding: { left: 0, right: 1, top: 0, bottom: 0 },
    })
  );
  console.log(`  ${chalk.gray("0.")} Sair\n`);
};

const main = async (): Promise<void> => {
  clear();
  printHeader();

  const runMenu = async (): Promise<void> => {
    printMenu();

    const choice = await ask("Escolha uma opção");

    if (choice === "0" || choice.toLowerCase() === "sair") {
      console.log(chalk.gray("\n  Até logo!\n"));
      return;
    }

    const choiceNum = parseInt(choice);
    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > MENU_ITEMS.length) {
      error("Opção inválida. Tente novamente.");
      console.log();
      return runMenu();
    }

    console.log();
    await MENU_ITEMS[choiceNum - 1].action();
    console.log();

    const continuar = await askYN("Voltar ao menu?");
    if (!continuar) {
      console.log(chalk.gray("\n  Até logo!\n"));
      return;
    }

    clear();
    printHeader();
    return runMenu();
  };

  await runMenu();
  rl.close();
};

main().catch((err) => {
  console.error(chalk.red("Erro fatal:"), err);
  rl.close();
  process.exit(1);
});
