import React from "react";
import { getPasswordStrength, type PasswordStrength } from "@lib/passwordStrength";

interface PasswordStrengthMeterProps {
  password: string;
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; color: string; width: string }> = {
  fraca: { label: "Fraca", color: "bg-destructive", width: "w-1/3" },
  media: { label: "Média", color: "bg-warning", width: "w-2/3" },
  forte: { label: "Forte", color: "bg-success", width: "w-full" },
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const config = STRENGTH_CONFIG[strength];

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${config.color} ${config.width} transition-all duration-300`} />
      </div>
      <p className="text-xs text-muted-foreground">
        Força da senha: <span className="font-medium text-foreground">{config.label}</span>
      </p>
    </div>
  );
};
