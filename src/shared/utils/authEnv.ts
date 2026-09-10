import { z } from "zod";

const authEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL não configurada — necessária para o TypeORM e o Better Auth se conectarem ao Postgres." })
    .min(1, "DATABASE_URL não configurada — necessária para o TypeORM e o Better Auth se conectarem ao Postgres."),
  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET não configurada — gere uma com `openssl rand -base64 32`." })
    .min(1, "BETTER_AUTH_SECRET não configurada — gere uma com `openssl rand -base64 32`."),
  BETTER_AUTH_URL: z.string().optional(),
  DASHBOARD_URL: z.string().optional(),
  RESEND_API_KEY: z
    .string({ error: "RESEND_API_KEY não configurada — necessária para o envio do email de recuperação de senha." })
    .min(1, "RESEND_API_KEY não configurada — necessária para o envio do email de recuperação de senha."),
  RESEND_FROM_EMAIL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export const getAuthEnv = (): AuthEnv => {
  const result = authEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(" "));
  }
  return result.data;
};
