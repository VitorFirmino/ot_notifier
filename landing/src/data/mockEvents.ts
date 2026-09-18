export interface MockActivityEvent {
  id: string;
  kind: "level-up" | "death";
  character: string;
  detail: string;
  timeLabel: string;
}

export const MOCK_ACTIVITY_EVENTS: MockActivityEvent[] = [
  { id: "1", kind: "level-up", character: "Fulaninho", detail: "subiu para o nível 132", timeLabel: "agora" },
  { id: "2", kind: "death", character: "Beregar", detail: "morto por Ciclope (nível 87)", timeLabel: "há 2 min" },
  { id: "3", kind: "level-up", character: "Dark Knightz", detail: "subiu para o nível 256", timeLabel: "há 5 min" },
  { id: "4", kind: "death", character: "Sorcerinha", detail: "morta por Demon (nível 143)", timeLabel: "há 9 min" },
];
