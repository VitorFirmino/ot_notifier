export type ActionTintColor = "primary" | "success" | "warning";

const CLASS_NAMES: Record<ActionTintColor, string> = {
  primary: "text-primary hover:text-primary",
  success: "text-success hover:text-success",
  warning: "text-warning hover:text-warning",
};

export const getActionTintStyle = (color: ActionTintColor): { background: string } => ({
  background: `linear-gradient(165deg, color-mix(in oklab, var(--${color}) 18%, var(--secondary)) 0%, var(--secondary) 100%)`,
});

export const getActionTintClassName = (color: ActionTintColor): string => CLASS_NAMES[color];
