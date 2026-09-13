import React, { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Webhook, ShieldCheck, BellRing, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Alert, AlertDescription } from "@components/ui/alert";
import { api } from "@services/api";

const testWebhookSchema = z.object({
  discordWebhook: z.union([z.literal(""), z.url("Informe uma URL válida.")]),
});

type TestWebhookFormValues = z.infer<typeof testWebhookSchema>;

export const GlobalSettingsView: React.FC = () => {
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const {
    register,
    control,
    formState: { errors },
  } = useForm<TestWebhookFormValues>({
    resolver: zodResolver(testWebhookSchema),
    defaultValues: { discordWebhook: "" },
  });
  const discordWebhook = useWatch({ control, name: "discordWebhook" });

  const handleTestDiscord = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      await api.testWebhookUrl(discordWebhook);
      setTestResult("✅ Mensagem de teste enviada! Confira o canal Discord.");
    } catch {
      setTestResult("❌ Não foi possível enviar a mensagem de teste. Verifique a URL do webhook.");
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card className="py-0">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Configurações Globais & Integrações
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Teste um webhook do Discord antes de configurá-lo em um servidor.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-2 border-b border-border pb-3 text-sm font-medium text-primary">
            <Webhook className="h-4 w-4" />
            <span>Testar webhook do Discord</span>
          </div>

          <div className="max-w-md space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
            <Label htmlFor="discordWebhook" className="flex items-center gap-2 text-xs">
              <Webhook className="h-4 w-4 text-primary" />
              Discord webhook URL
            </Label>
            <Input
              id="discordWebhook"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              className="font-mono text-xs"
              aria-invalid={!!errors.discordWebhook}
              {...register("discordWebhook")}
            />
            {errors.discordWebhook && (
              <p className="text-[11px] text-destructive">{errors.discordWebhook.message}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestDiscord}
              disabled={testingWebhook || !discordWebhook}
            >
              <BellRing className={`h-3.5 w-3.5 ${testingWebhook ? "animate-bounce" : ""}`} />
              {testingWebhook ? "Testando..." : "Enviar teste Discord"}
            </Button>
          </div>

          {testResult && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
