export type ActionTintColor = "primary" | "success" | "warning" | "discord";

const CSS_COLORS: Record<ActionTintColor, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  discord: "#5865F2",
};

const CLASS_NAMES: Record<ActionTintColor, string> = {
  primary: "text-primary hover:text-primary",
  success: "text-success hover:text-success",
  warning: "text-warning hover:text-warning",
  discord: "text-[#5865F2] hover:text-[#5865F2]",
};

export const getActionTintStyle = (color: ActionTintColor): { background: string } => ({
  background: `linear-gradient(165deg, color-mix(in oklab, ${CSS_COLORS[color]} 18%, var(--secondary)) 0%, var(--secondary) 100%)`,
});

export const getActionTintClassName = (color: ActionTintColor): string => CLASS_NAMES[color];
