import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { authClient } from "@lib/authClient";
import logo from "@assets/logo.png";
import { ThemeToggle } from "@components/ThemeToggle";
import { PasswordStrengthMeter } from "@components/PasswordStrengthMeter";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setApiError(null);
    if (!token) {
      setApiError("Link de recuperação inválido ou expirado.");
      return;
    }
    try {
      const result = await authClient.resetPassword({ newPassword: values.newPassword, token });
      if (result.error) {
        setApiError("Não foi possível redefinir a senha. O link pode ter expirado.");
        return;
      }
      setIsDone(true);
    } catch {
      setApiError("Não foi possível conectar à API. Verifique se o backend está rodando.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="animate-drift absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-warning/15 blur-3xl [animation-delay:-8s]" />
        <div className="animate-drift absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-success/15 blur-3xl [animation-delay:-16s]" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <div className="animate-breathe">
          <img
            src={logo}
            alt="OT Notifier"
            className="h-20 w-20 rounded-2xl object-cover shadow-[0_0_44px_-6px_var(--primary)] transition-transform duration-300 ease-out hover:scale-110"
          />
        </div>

        <Card className="w-full py-0" style={{ background: "color-mix(in oklab, var(--card) 58%, transparent)" }}>
          <CardContent className="space-y-5 p-8">
            <h1 className="font-heading text-3xl font-semibold text-foreground">Nova senha</h1>

            {!token && (
              <p className="text-sm text-destructive">
                Link de recuperação inválido ou expirado. Peça um novo link na tela de login.
              </p>
            )}

            {token && isDone && (
              <div className="space-y-4">
                <p className="text-sm text-success">Senha alterada com sucesso.</p>
                <Button className="group h-12 w-full text-base" onClick={() => navigate("/")}>
                  Ir para o login
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </div>
            )}

            {token && !isDone && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-base">
                    Nova senha:
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    aria-invalid={!!errors.newPassword}
                    className="h-12 px-4 py-3 text-base transition-colors duration-200 hover:border-primary/40 md:text-base"
                    {...register("newPassword")}
                  />
                  {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
                  <PasswordStrengthMeter password={newPassword} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base">
                    Repetir senha:
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Digite a senha novamente"
                    aria-invalid={!!errors.confirmPassword}
                    className="h-12 px-4 py-3 text-base transition-colors duration-200 hover:border-primary/40 md:text-base"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {apiError && <p className="text-sm text-destructive">{apiError}</p>}

                <Button
                  type="submit"
                  className="group h-12 w-full text-base transition-shadow duration-200 hover:shadow-[0_0_24px_-6px_var(--primary)]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Redefinir senha"}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
