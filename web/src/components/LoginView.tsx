import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { authClient } from "@lib/authClient";
import logo from "@assets/logo.png";
import { GoogleIcon } from "@components/icons/GoogleIcon";

const loginSchema = z
  .object({
    mode: z.enum(["login", "signup"]),
    name: z.string(),
    email: z.email("Informe um email válido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  })
  .refine((data) => data.mode === "login" || data.name.trim().length > 0, {
    message: "Informe seu nome.",
    path: ["name"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;

const forgotPasswordSchema = z.object({
  email: z.email("Informe um email válido."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const LoginView: React.FC = () => {
  const [view, setView] = useState<"credentials" | "forgot">("credentials");
  const [apiError, setApiError] = useState<string | null>(null);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    shouldUnregister: false,
    defaultValues: { mode: "login", name: "", email: "", password: "" },
  });

  const {
    register: registerForgotPassword,
    handleSubmit: handleForgotPasswordSubmit,
    formState: { errors: forgotPasswordErrors, isSubmitting: isSendingForgotPassword },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mode = watch("mode");

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      const result =
        values.mode === "login"
          ? await authClient.signIn.email({ email: values.email, password: values.password })
          : await authClient.signUp.email({ email: values.email, password: values.password, name: values.name });

      if (result.error) {
        setApiError("Não foi possível autenticar. Verifique seus dados e tente novamente.");
      }
    } catch (err: unknown) {
      setApiError("Não foi possível conectar à API. Verifique se o backend está rodando.");
    }
  };

  const onForgotPasswordSubmit = async (values: ForgotPasswordFormValues) => {
    setApiError(null);
    try {
      await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setForgotPasswordSent(true);
    } catch (err: unknown) {
      setApiError("Não foi possível conectar à API. Verifique se o backend está rodando.");
    }
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: window.location.origin });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
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
            {view === "forgot" ? (
              <>
                <h1 className="font-heading text-3xl font-semibold text-foreground">Recuperar senha</h1>

                {forgotPasswordSent ? (
                  <p className="text-sm text-success">
                    Se esse email existir na nossa base, você vai receber um link de recuperação em instantes.
                  </p>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit(onForgotPasswordSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-base">Email:</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="voce@email.com"
                        aria-invalid={!!forgotPasswordErrors.email}
                        className="h-12 px-4 py-3 text-base transition-colors duration-200 hover:border-primary/40 md:text-base"
                        {...registerForgotPassword("email")}
                      />
                      {forgotPasswordErrors.email && (
                        <p className="text-sm text-destructive">{forgotPasswordErrors.email.message}</p>
                      )}
                    </div>

                    {apiError && <p className="text-sm text-destructive">{apiError}</p>}

                    <Button
                      type="submit"
                      className="group h-12 w-full text-base transition-shadow duration-200 hover:shadow-[0_0_24px_-6px_var(--primary)]"
                      disabled={isSendingForgotPassword}
                    >
                      {isSendingForgotPassword ? "Enviando..." : "Enviar link de recuperação"}
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Button>
                  </form>
                )}

                <button
                  type="button"
                  className="cursor-pointer text-sm text-primary hover:underline"
                  onClick={() => {
                    setView("credentials");
                    setForgotPasswordSent(false);
                  }}
                >
                  Voltar para o login
                </button>
              </>
            ) : (
              <>
                <h1 className="font-heading text-3xl font-semibold text-foreground">
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base">Nome:</Label>
                      <Input
                        id="name"
                        placeholder="Como podemos te chamar"
                        aria-invalid={!!errors.name}
                        className="h-12 px-4 py-3 text-base transition-colors duration-200 hover:border-primary/40 md:text-base"
                        {...register("name")}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">Email:</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@email.com"
                      aria-invalid={!!errors.email}
                      className="h-12 px-4 py-3 text-base transition-colors duration-200 hover:border-primary/40 md:text-base"
                      {...register("email")}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-base">Senha:</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          className="cursor-pointer text-xs text-primary hover:underline"
                          onClick={() => setView("forgot")}
                        >
                          Esqueci minha senha
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo de 8 caracteres"
                      aria-invalid={!!errors.password}
                      className="h-12 px-4 py-3 text-base transition-colors duration-200 hover:border-primary/40 md:text-base"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                  </div>

                  {apiError && <p className="text-sm text-destructive">{apiError}</p>}

                  <Button
                    type="submit"
                    className="group h-12 w-full text-base transition-shadow duration-200 hover:shadow-[0_0_24px_-6px_var(--primary)]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Enviando..." : mode === "login" ? "Entrar" : "Criar conta"}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </form>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full text-base"
                  onClick={handleGoogleSignIn}
                >
                  <GoogleIcon className="size-4" />
                  Continuar com Google
                </Button>

                <button
                  type="button"
                  className="cursor-pointer text-sm text-primary hover:underline"
                  onClick={() => setValue("mode", mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
