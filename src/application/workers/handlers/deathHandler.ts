import type { CharacterInfo, DeathInfo } from "@shared/types/index";
import { sendDeathWebhook } from "@infrastructure/webhooks/webhook";
import { recordCharacterEvent } from "@infrastructure/events/eventLog";

interface DeathParams {
  webhookUrl: string;
  serverId: string;
  serverName: string;
  name: string;
  death: DeathInfo;
}

export const handleDeath = async (params: DeathParams): Promise<Partial<CharacterInfo>> => {
  const { webhookUrl, serverId, serverName, name, death } = params;

  let webhookSent = false;
  try {
    webhookSent = await sendDeathWebhook({
      webhookUrl,
      name,
      deathLevel: death.level,
      killers: death.killers,
      deathText: death.deathText,
      time: death.time,
    });
  } catch (error) {
    console.error(error);
  }

  await recordCharacterEvent({
    serverId,
    serverName,
    type: "death",
    characterName: name,
    level: death.level,
    killers: death.killers,
    details: death.deathText,
    webhookSent,
  });

  return { last_death: death };
};

export const isNewDeath = (
  previous: DeathInfo | null | undefined,
  current: DeathInfo | null | undefined
): current is DeathInfo => {
  if (!current) return false;
  if (!previous) return true;

  return (
    current.level !== previous.level ||
    current.deathText !== previous.deathText ||
    (current.time ?? "") !== (previous.time ?? "")
  );
};
