import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { authClient } from "@lib/authClient";

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

export const LoginView: React.FC = () => {
  const [apiError, setApiError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm py-0">
        <CardContent className="space-y-4 p-6">
          <h1 className="font-heading text-lg font-semibold text-foreground">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" aria-invalid={!!errors.password} {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {apiError && <p className="text-xs text-destructive">{apiError}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            type="button"
            className="cursor-pointer text-xs text-primary hover:underline"
            onClick={() => setValue("mode", mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
