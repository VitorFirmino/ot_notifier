import type { CharacterInfo } from "@shared/types/index";
import { sendWebhook } from "@infrastructure/webhooks/webhook";
import { UP_MESSAGES } from "@infrastructure/storage/messageRules";

interface LevelUpParams {
  webhookUrl: string;
  name: string;
  currentLevel: number;
  lastLevel: number;
  info: CharacterInfo;
}

interface LevelDownParams {
  webhookUrl: string;
  name: string;
  currentLevel: number;
}

const calculateMilestone = (streak: number, lastMilestone: number): number | undefined => {
  const sortedMilestones = UP_MESSAGES.map(({ minStreak }) => minStreak).sort((a, b) => b - a);

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
  const { webhookUrl, name, currentLevel, lastLevel, info } = params;
  const { newStreak, nextMilestone, ...updates } = createLevelUpUpdate(
    currentLevel,
    lastLevel,
    info
  );

  try {
    await sendWebhook({
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

  return {
    ...info,
    ...updates,
  };
};

export const handleLevelDown = async (params: LevelDownParams): Promise<Partial<CharacterInfo>> => {
  const { webhookUrl, name, currentLevel } = params;

  try {
    await sendWebhook({
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

  return {
    last_level: currentLevel,
    up_streak: 0,
  };
};

export const initializeFirstTimeCharacter = (level: number): Partial<CharacterInfo> => {
  return {
    last_level: level,
    up_streak: 0,
    last_milestone: 0,
  };
};

export const isFirstTimeCharacter = ({ last_level }: CharacterInfo): boolean => {
  return last_level === null;
};
