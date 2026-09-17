export interface MockActivityEvent {
  id: string;
  kind: "level-up" | "death" | "webhook";
  message: string;
}

export const MOCK_ACTIVITY_EVENTS: MockActivityEvent[] = [
  { id: "1", kind: "level-up", message: "Fulaninho subiu para o nível 132." },
  { id: "2", kind: "death", message: "Ciclope matou Beregar (nível 87)." },
  { id: "3", kind: "webhook", message: "Notificação enviada ao Discord." },
  { id: "4", kind: "level-up", message: "Dark Knightz subiu para o nível 256." },
  { id: "5", kind: "death", message: "Demon matou Sorcerinha (nível 143)." },
  { id: "6", kind: "webhook", message: "Notificação enviada ao Discord." },
];
