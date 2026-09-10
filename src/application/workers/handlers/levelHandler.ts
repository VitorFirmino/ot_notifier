import type { CharacterInfo, DeathInfo } from "@shared/types/index";
import { sendWebhook } from "@infrastructure/webhooks/webhook";
import { recordCharacterEvent } from "@infrastructure/events/eventLog";
import { UP_MESSAGES } from "@infrastructure/storage/messageRules";

interface LevelUpParams {
  webhookUrl: string;
  serverId: string;
  serverName: string;
  name: string;
  currentLevel: number;
  lastLevel: number;
  info: CharacterInfo;
}

interface LevelDownParams {
  webhookUrl: string;
  serverId: string;
  serverName: string;
  name: string;
  currentLevel: number;
}

const calculateMilestone = (streak: number, lastMilestone: number): number | undefined => {
  const sortedMilestones = UP_MESSAGES.map(({ minStreak }) => minStreak).sort((streakA, streakB) => streakB - streakA);

  return sortedMilestones.find((milestone) => streak >= milestone && milestone > lastMilestone);
};

const createLevelUpUpdate = (
  currentLevel: number,
  lastLevel: number,
  { up_streak = 0, last_milestone = 0 }: CharacterInfo
) => {
  const levelGain = currentLevel - lastLevel;
  const newStreak = up_streak + levelGain;
  const nextMilestone = calculateMilestone(newStreak, last_milestone);

  return {
    last_level: currentLevel,
    up_streak: newStreak,
    last_milestone: nextMilestone ?? last_milestone,
    newStreak,
    nextMilestone,
  };
};

export const handleLevelUp = async (params: LevelUpParams): Promise<CharacterInfo> => {
  const { webhookUrl, serverId, serverName, name, currentLevel, lastLevel, info } = params;
  const { newStreak, nextMilestone, ...updates } = createLevelUpUpdate(
    currentLevel,
    lastLevel,
    info
  );

  let webhookSent = false;
  try {
    webhookSent = await sendWebhook({
      webhookUrl,
      name,
      currentLevel,
      status: "up",
      upStreak: newStreak,
      milestoneReached: nextMilestone,
    });
  } catch (error) {
    console.error(error);
  }

  await recordCharacterEvent({
    serverId,
    serverName,
    type: "level_up",
    characterName: name,
    level: currentLevel,
    previousLevel: lastLevel,
    streak: newStreak,
    milestone: nextMilestone,
    webhookSent,
  });

  return {
    ...info,
    ...updates,
  };
};

export const handleLevelDown = async (params: LevelDownParams): Promise<Partial<CharacterInfo>> => {
  const { webhookUrl, serverId, serverName, name, currentLevel } = params;

  let webhookSent = false;
  try {
    webhookSent = await sendWebhook({
      webhookUrl,
      name,
      currentLevel,
      status: "down",
      upStreak: 0,
      milestoneReached: 0,
    });
  } catch (error) {
    console.error(error);
  }

  await recordCharacterEvent({
    serverId,
    serverName,
    type: "level_down",
    characterName: name,
    level: currentLevel,
    webhookSent,
  });

  return {
    last_level: currentLevel,
    up_streak: 0,
  };
};

export const initializeFirstTimeCharacter = (
  level: number,
  lastDeath?: DeathInfo | null
): Partial<CharacterInfo> => {
  return {
    last_level: level,
    up_streak: 0,
    last_milestone: 0,
    last_death: lastDeath ?? null,
  };
};

export const isFirstTimeCharacter = ({ last_level }: CharacterInfo): boolean => {
  return last_level === null;
};
