export type PasswordStrength = "fraca" | "media" | "forte";

export interface PasswordRequirement {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "length", label: "Pelo menos 8 caracteres", test: (password) => password.length >= 8 },
  {
    key: "case",
    label: "Letra maiúscula e minúscula",
    test: (password) => /[a-z]/.test(password) && /[A-Z]/.test(password),
  },
  { key: "digit", label: "Pelo menos um número", test: (password) => /\d/.test(password) },
  {
    key: "symbol",
    label: "Pelo menos um símbolo (!@#$%...)",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

const requirementTest = (key: string, password: string): boolean =>
  PASSWORD_REQUIREMENTS.find((requirement) => requirement.key === key)?.test(password) ?? false;

export const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (requirementTest("case", password)) score++;
  if (requirementTest("digit", password)) score++;
  if (requirementTest("symbol", password)) score++;

  if (score <= 2) return "fraca";
  if (score === 3) return "media";
  return "forte";
};
