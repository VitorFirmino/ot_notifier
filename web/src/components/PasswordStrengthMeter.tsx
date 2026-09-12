import React from "react";
import { Check, X } from "lucide-react";
import { getPasswordStrength, PASSWORD_REQUIREMENTS, type PasswordStrength } from "@lib/passwordStrength";

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
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${config.color} ${config.width} transition-all duration-300`} />
        </div>
        <p className="text-xs text-muted-foreground">
          Força da senha: <span className="font-medium text-foreground">{config.label}</span>
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = requirement.test(password);
          return (
            <li
              key={requirement.key}
              className={`flex items-center gap-1.5 text-xs ${met ? "text-success" : "text-destructive/80"}`}
            >
              {met ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
              {requirement.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
