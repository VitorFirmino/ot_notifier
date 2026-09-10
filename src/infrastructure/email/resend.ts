import { Resend } from "resend";
import { getAuthEnv } from "@shared/utils/authEnv";

export const sendPasswordResetEmail = async (params: {
  to: string;
  resetUrl: string;
}): Promise<void> => {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = getAuthEnv();

  const resend = new Resend(RESEND_API_KEY);
  const result = await resend.emails.send({
    from: RESEND_FROM_EMAIL ?? "OT Notifier <onboarding@resend.dev>",
    to: params.to,
    subject: "Recuperação de senha - OT Notifier",
    html: `
      <p>Você pediu para redefinir sua senha no OT Notifier.</p>
      <p><a href="${params.resetUrl}">Clique aqui para criar uma nova senha</a></p>
      <p>Se você não pediu isso, pode ignorar este email.</p>
    `,
  });

  if (result.error) {
    throw new Error(`Falha ao enviar email via Resend: ${result.error.message}`);
  }
};
