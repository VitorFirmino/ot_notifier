export type StreakMessage = {
  minStreak: number;
  message: string;
};

export const UP_MESSAGES: StreakMessage[] = [
  { minStreak: 3, message: "😳 Vai deixar o cara upar mesmo?" },
  {
    minStreak: 5,
    message: "👀 Tá upando escondido, só pode... Vai deixar mesmo???",
  },
  {
    minStreak: 10,
    message: "🚨 É melhor colocar esse cara na guild logo!!! 🚨",
  },
];
