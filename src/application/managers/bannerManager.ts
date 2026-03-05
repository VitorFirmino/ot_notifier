import boxen from "boxen";
import chalk from "chalk";
import gradient from "gradient-string";
import { setBannerAndHeader } from "@shared/utils/blockRenderer";
import { getAllServerConfigs } from "@infrastructure/storage/serverConfigManager";
import type { ServerConfig } from "@shared/types/index";

interface BannerConfig {
  serverCount: number;
  servers: ServerConfig[];
}

export const createBanner = (): string => {
  const bannerLines = [
    " ██████╗ ████████╗    ███╗   ██╗ ██████╗ ████████╗██╗███████╗██╗███████╗██████╗ ",
    "██╔═══██╗╚══██╔══╝    ████╗  ██║██╔═══██╗╚══██╔══╝██║██╔════╝██║██╔════╝██╔══██╗",
    "██║   ██║   ██║       ██╔██╗ ██║██║   ██║   ██║   ██║█████╗  ██║█████╗  ██████╔╝",
    "██║   ██║   ██║       ██║╚██╗██║██║   ██║   ██║   ██║██╔══╝  ██║██╔══╝  ██╔══██╗",
    "╚██████╔╝   ██║       ██║ ╚████║╚██████╔╝   ██║   ██║██║     ██║███████╗██║  ██║",
    " ╚═════╝    ╚═╝       ╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝",
  ];

  const otNotifierGradient = gradient(["#06B6D4", "#0EA5E9", "#14B8A6", "#F59E0B"]);
  return otNotifierGradient.multiline(bannerLines.join("\n"));
};

export const createHeader = (config: BannerConfig): string => {
  const { serverCount, servers } = config;
  const otNotifierGradient = gradient(["#06B6D4", "#0EA5E9", "#14B8A6"]);

  const workingServers: typeof servers = [];
  const notWorkingServers: typeof servers = [];

  servers.forEach((server) => {
    const enabled = server.guild?.enabled !== false;
    const isWorking = server.isWorking !== false;

    if (enabled && isWorking) {
      workingServers.push(server);
    } else {
      notWorkingServers.push(server);
    }
  });

  const lines: string[] = [
    chalk.bold(otNotifierGradient("🚀 Sistema de Monitoramento Multi-Servidor para Open Tibia")),
    "",
    `📊 ${chalk.bold("Status:")} ${chalk.green.bold(workingServers.length)} Ativos | ${chalk.red.bold(notWorkingServers.length)} Inativos | ${chalk.bold(serverCount)} Total`,
  ];

  if (workingServers.length > 0) {
    lines.push("");
    lines.push(chalk.green.bold(`✅ Ativos:`));
    const maxVisible = workingServers.length;
    const visible = workingServers.slice(0, maxVisible);
    visible.forEach((server) => {
      const serverName = server.serverName || server.serverId;
      lines.push(`   ${chalk.green("•")} ${serverName}`);
    });
    if (workingServers.length > maxVisible) {
      lines.push(`   ${chalk.gray(`+${workingServers.length - maxVisible} servidores`)}`);
    }
  }

  if (notWorkingServers.length > 0 && notWorkingServers.length <= 5) {
    lines.push("");
    lines.push(chalk.red.bold(`❌ Inativos:`));
    notWorkingServers.forEach((server) => {
      const serverName = server.serverName || server.serverId;
      const reason = server.guild?.enabled === false
        ? "Desabilitado"
        : server.isWorking === false
          ? "Servidor down"
          : "Indisponível";
      lines.push(`   ${chalk.red("•")} ${serverName} (${chalk.gray(reason)})`);
    });
  } else if (notWorkingServers.length > 5) {
    lines.push("");
    lines.push(chalk.red.bold(`❌ Inativos: ${chalk.gray(`${notWorkingServers.length} servidores (use logs para detalhes)`)}`));
  }

  return boxen(lines.join("\n"), {
    title: "SISTEMA PRONTO",
    borderColor: notWorkingServers.length > (workingServers.length / 2) ? "yellow" : "cyan",
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    margin: { top: 0, bottom: 1 },
    borderStyle: "double",
  });
};

export const initializeBanner = async (serverCount: number): Promise<void> => {
  const servers = await getAllServerConfigs();
  const banner = createBanner();
  const header = createHeader({ serverCount, servers });
  setBannerAndHeader(banner, header);
};
