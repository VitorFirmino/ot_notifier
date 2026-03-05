import chalk from "chalk";
import boxen from "boxen";
import type { ServerStates } from "../types/serverState";
import { getAllServerConfigsSync } from "@infrastructure/storage/serverConfigManager";

const SERVER_COLORS = [
  "cyan", "green", "yellow", "magenta", "blue", "red", "white", "gray", "brightCyan", "brightGreen",
] as const;

const getServerColorFn = (serverId: string): ((text: string) => string) => {
  let hash = 0;
  for (let i = 0; i < serverId.length; i++) {
    hash = (hash << 5) - hash + serverId.charCodeAt(i);
    hash = hash & hash;
  }
  const colorMap: Record<string, any> = {
    cyan: chalk.cyan, green: chalk.green, yellow: chalk.yellow,
    magenta: chalk.magenta, blue: chalk.blue, red: chalk.red,
    white: chalk.white, gray: chalk.gray,
  };
  const index = Math.abs(hash) % SERVER_COLORS.length;
  return colorMap[SERVER_COLORS[index]] || chalk.white;
};

const UI_WIDTH = 74;
let topContent = "";
let lastRenderedContent = "";
let hasEnteredAlternateScreen = false;
let lastScrollPrintAt = 0;
let hasPrintedScrollableHeader = false;
let hasPrintedLiveBanner = false;

const isInteractiveTerminal = Boolean(process.stdout.isTTY);
const uiMode = (process.env.UI_MODE ?? (isInteractiveTerminal ? "live" : "scroll")).toLowerCase();
const useLiveUi = isInteractiveTerminal && uiMode === "live";
const useAlternateScreen =
  useLiveUi && process.env.UI_ALTERNATE_SCREEN === "true";
const scrollPrintIntervalMs = Math.max(
  1000,
  Number.parseInt(process.env.UI_SCROLL_INTERVAL_MS ?? "10000", 10) || 10000
);

const enterAlternateScreen = (): void => {
  if (!useAlternateScreen || hasEnteredAlternateScreen) return;
  process.stdout.write("\u001b[?1049h\u001b[H");
  hasEnteredAlternateScreen = true;
};

const exitAlternateScreen = (): void => {
  if (!hasEnteredAlternateScreen) return;
  process.stdout.write("\u001b[?1049l");
  hasEnteredAlternateScreen = false;
};

const renderContent = (content: string): void => {
  if (!content) return;
  if (useLiveUi) {
    if (content === lastRenderedContent) return;
    process.stdout.write("\x1b[H\x1b[J");
    process.stdout.write(content);
    lastRenderedContent = content;
    return;
  }

  const now = Date.now();
  if (lastRenderedContent && now - lastScrollPrintAt < scrollPrintIntervalMs) {
    return;
  }

  if (content === lastRenderedContent) {
    return;
  }

  const separator = chalk.gray("─".repeat(UI_WIDTH));
  const timestamp = chalk.gray(
    `[${new Date(now).toLocaleTimeString("pt-BR", { hour12: false })}] Atualização`
  );
  console.log(`\n${timestamp}\n${content}\n${separator}`);
  lastRenderedContent = content;
  lastScrollPrintAt = now;
};

process.once("exit", () => {
  exitAlternateScreen();
});

const truncateWithEllipsis = (value: string, max: number): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
};

const formatCountdown = (timestamp: number): string => {
  const timeUntil = timestamp - Date.now();

  if (timeUntil <= 1500) {
    return "agora";
  }

  if (!useLiveUi) {
    if (timeUntil > 60000) {
      return `${Math.ceil(timeUntil / 60000)}m`;
    }
    return "menos de 1m";
  }

  if (timeUntil > 60000) {
    return `${Math.floor(timeUntil / 60000)}m ${String(Math.floor((timeUntil % 60000) / 1000)).padStart(2, "0")}s`;
  }

  return `${Math.floor(timeUntil / 1000)}s`;
};

const normalizeWarningMessage = (message: string): string => {
  const lower = message.toLowerCase();

  if (
    lower.includes("cloudflare") ||
    lower.includes("anti-bot") ||
    lower.includes("proteção") ||
    lower.includes("protegido")
  ) {
    return "Protegido por Cloudflare / anti-bot.";
  }

  if (lower.includes("nenhum membro") || lower.includes("sem jogadores")) {
    return "Nenhum membro encontrado na guild.";
  }

  if (lower.includes("indisponível") || lower.includes("servidor down")) {
    return "Servidor indisponível no momento.";
  }

  if (lower.includes("timeout") || lower.includes("demorou")) {
    return "Servidor demorou para responder.";
  }

  if (lower.includes("desabilitada")) {
    return "Guild desabilitada.";
  }

  return message;
};

const getOperationalServers = () => {
  const allServers = getAllServerConfigsSync();
  return allServers.filter((server) => {
    return server.guild?.enabled !== false && server.isWorking !== false;
  });
};

export const renderProcessingBlock = (states: ServerStates): string => {
  const workingServers = getOperationalServers();
  if (workingServers.length === 0) return "";

  const lines: string[] = [];
  const NAME_COL = Math.min(22, Math.max(8, ...workingServers.map((s) => s.serverName.length)));

  workingServers.sort((a, b) => a.serverId.localeCompare(b.serverId)).forEach((server) => {
    const state = states[server.serverId];
    const colorFn = getServerColorFn(server.serverId);
    const name = truncateWithEllipsis(server.serverName, NAME_COL).padEnd(NAME_COL);

    const isFinished = !!state?.finished;
    const hasNextCheck = !!state?.nextCheck;

    if (state?.processing && !isFinished && !hasNextCheck) {
      const { processed = 0, totalCharacters = 0, startTime = 0 } = state.processing;
      const progress = totalCharacters > 0 ? Math.round((processed / totalCharacters) * 100) : 0;
      const elapsedSec = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const elapsedText = elapsedSec > 0 ? ` ${chalk.gray(`${elapsedSec}s`)}` : "";
      if (progress >= 100 && elapsedSec > 5) {
        lines.push(`${colorFn(name)} ${chalk.gray("→")} ${chalk.yellow("Finalizando...")}${elapsedText}`);
      } else {
        const barWidth = 12;
        const filled = Math.min(barWidth, Math.floor((progress / 100) * barWidth));
        const progressBar = `[${chalk.cyan("█".repeat(filled))}${chalk.gray("░".repeat(barWidth - filled))}] ${chalk.bold(String(progress).padStart(3))}%`;
        lines.push(`${colorFn(name)} ${chalk.gray("→")} ${chalk.white(`${String(processed).padStart(3)}/${String(totalCharacters).padStart(4)}`)} ${progressBar}${elapsedText}`);
      }
    } else if (state?.verifying) {
      const { totalCharacters = 0, elapsed = 0 } = state.verifying;
      lines.push(`${colorFn(name)} ${chalk.gray("→")} ${chalk.magenta(`Verificando ${totalCharacters} resultados... ${elapsed.toFixed(0)}s`)}`);
    } else if (state?.nextCheck) {
      const timeStr = formatCountdown(state.nextCheck.timestamp);
      const label =
        timeStr === "agora" ? chalk.yellow("Atualizando...") : `Próxima em ${chalk.yellow(timeStr)}`;
      const onlineInfo = state.finished ? chalk.gray(` (${state.finished.online} online)`) : "";
      lines.push(`${chalk.white(name)} ${chalk.gray("→")} ${label}${onlineInfo}`);
    } else {
      lines.push(
        `${chalk.gray(name)} ${chalk.gray("→")} ${chalk.gray("Aguardando...")}`
      );
    }
  });

  if (lines.length === 0) return "";

  return boxen(lines.join("\n"), {
    title: chalk.bold.blue(" 🔄 EM ATIVIDADE "),
    borderColor: "blue",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: "round",
    width: UI_WIDTH,
  });
};

export const renderFinishedBlock = (states: ServerStates): string => {
  const finishedStates = Object.entries(states)
    .filter(([_, state]) => state.finished)
    .sort((a, b) => (b[1].finished?.timestamp || 0) - (a[1].finished?.timestamp || 0))
    .slice(0, 5);

  if (finishedStates.length === 0) return "";

  const configs = getAllServerConfigsSync();
  const lines: string[] = finishedStates.map(([serverId, state]) => {
    const config = configs.find(c => c.serverId === serverId);
    const rawName = config?.serverName || serverId;
    const name = truncateWithEllipsis(rawName, 22).padEnd(22);
    const f = state.finished!;

    const onlineText = chalk.cyan.bold(String(f.online).padStart(3));
    const changesText = f.changes > 0 ? chalk.green.bold(`${f.changes} mudança${f.changes !== 1 ? "s" : ""}`) : chalk.gray("sem mudanças");
    const errText = f.errors > 0 ? ` ${chalk.red(`${f.errors} erro${f.errors !== 1 ? "s" : ""}`)}` : "";
    const durText = chalk.gray(`${f.duration}s`);

    return `${chalk.white(name)} ${chalk.gray("→")} ${chalk.cyan("Online:")}${onlineText}  ${changesText}${errText}  ${durText}`;
  });

  return boxen(lines.join("\n"), {
    title: chalk.bold.green(" ✅ ÚLTIMAS SINCRONIZAÇÕES "),
    borderColor: "green",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: "round",
    width: UI_WIDTH,
  });
};

export const renderWarningsBlock = (states: ServerStates): string => {
  const warnedServers = getAllServerConfigsSync().filter(
    (s) => s.guild?.enabled !== false && !!states[s.serverId]?.warn
  );
  if (warnedServers.length === 0) return "";

  const nameMaxLength = Math.min(20, Math.max(8, ...warnedServers.map((s) => s.serverName.length)));
  const msgMaxLength = UI_WIDTH - 4 - nameMaxLength - 3;
  const lines = warnedServers.map((server) => {
    const name = truncateWithEllipsis(server.serverName, nameMaxLength).padEnd(nameMaxLength);
    const message = states[server.serverId]?.warn?.message || "";
    const normalized = normalizeWarningMessage(message);
    const truncated = truncateWithEllipsis(normalized, msgMaxLength);
    return `${chalk.red(name)} ${chalk.gray("→")} ${chalk.yellow(truncated)}`;
  });

  return boxen(lines.join("\n"), {
    title: chalk.bold.yellow(" ⚠️ ALERTAS "),
    borderColor: "yellow",
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: "round",
    width: UI_WIDTH,
  });
};

export const setBannerAndHeader = (banner: string, header: string): void => {
  topContent = `${banner}\n\n${header}`;
  if (useLiveUi) {
    if (!hasPrintedLiveBanner) {
      console.log(topContent);
      hasPrintedLiveBanner = true;
    }
    return;
  }
  renderContent(topContent);
};

export const renderAllBlocks = (states: ServerStates): void => {
  const blocks: string[] = [];
  
  const proc = renderProcessingBlock(states);
  if (proc) blocks.push(proc);
  
  const fin = renderFinishedBlock(states);
  if (fin) blocks.push(fin);
  
  const warn = renderWarningsBlock(states);
  if (warn) blocks.push(warn);
  
  const content = blocks.join("\n\n");
  const baseContent = content || chalk.gray("Carregando status dos servidores...");
  const fullContent = useLiveUi
    ? baseContent
    : !hasPrintedScrollableHeader && topContent
      ? `${topContent}\n\n${baseContent}`
      : baseContent;

  renderContent(fullContent);
  if (!useLiveUi && topContent && !hasPrintedScrollableHeader) {
    hasPrintedScrollableHeader = true;
  }
};

export const clearRender = (): void => {
  if (useLiveUi) {
    process.stdout.write("\x1b[H\x1b[J");
  }
  lastRenderedContent = "";
  exitAlternateScreen();
  hasPrintedScrollableHeader = false;
  hasPrintedLiveBanner = false;
};

export const coloredLabel = (color: string, text: string): string => {
  const colorMap: any = { blue: chalk.bgBlue.black, green: chalk.bgGreen.black, yellow: chalk.bgYellow.black };
  return (colorMap[color] || chalk.bgWhite.black)(` ${text} `);
};
