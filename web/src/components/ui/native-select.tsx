import React from "react";

interface NativeSelectOption {
  value: string;
  label: string;
}

interface NativeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: NativeSelectOption[];
  size?: "sm" | "default";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<NativeSelectProps["size"]>, string> = {
  sm: "h-8 px-2 text-xs",
  default: "h-9 px-2.5 text-sm",
};

export const NativeSelect: React.FC<NativeSelectProps> = ({
  value,
  onChange,
  options,
  size = "default",
  className = "",
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={`cursor-pointer rounded-lg border border-input bg-background text-foreground outline-none [color-scheme:dark] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${SIZE_CLASSES[size]} ${className}`}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value} className="bg-background text-foreground">
        {option.label}
      </option>
    ))}
  </select>
);
