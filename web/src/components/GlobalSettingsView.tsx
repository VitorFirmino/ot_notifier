import React, { useState } from "react";
import { Webhook, Bot, ShieldCheck, Save, BellRing, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";
import { Alert, AlertDescription } from "@components/ui/alert";
import { api } from "@services/api";

export const GlobalSettingsView: React.FC = () => {
  const [discordWebhook, setDiscordWebhook] = useState(
    localStorage.getItem("ot_discord_webhook") || ""
  );
  const [telegramToken, setTelegramToken] = useState(localStorage.getItem("ot_telegram_token") || "");
  const [telegramChatId, setTelegramChatId] = useState(localStorage.getItem("ot_telegram_chat_id") || "");
  const [enableDiscord, setEnableDiscord] = useState(true);
  const [enableTelegram, setEnableTelegram] = useState(false);

  const [scrapingInterval, setScrapingInterval] = useState(60);
  const [useAntiBot, setUseAntiBot] = useState(true);
  const [humanizePointer, setHumanizePointer] = useState(true);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem("ot_discord_webhook", discordWebhook);
    localStorage.setItem("ot_telegram_token", telegramToken);
    localStorage.setItem("ot_telegram_chat_id", telegramChatId);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestDiscord = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      await api.testWebhookUrl(discordWebhook);
      setTestResult("✅ Mensagem de teste enviada! Confira o canal Discord.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao enviar notificação de teste.";
      setTestResult(`❌ ${message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card className="py-0">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Configurações Globais & Integrações
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Gerencie notificações de mortes, entradas em guilds e modo de proteção anti-bot.
              </p>
            </div>
          </div>

          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            {savedSuccess ? "Salvo!" : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      {savedSuccess && (
        <Alert className="border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-success">Configurações atualizadas com sucesso!</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="py-0">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 text-sm font-medium text-primary">
              <Webhook className="h-4 w-4" />
              <span>Notificações & Webhooks</span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-xs">
                    <Webhook className="h-4 w-4 text-primary" />
                    Discord webhook URL
                  </Label>
                  <Switch checked={enableDiscord} onCheckedChange={setEnableDiscord} />
                </div>
                <Input
                  type="url"
                  value={discordWebhook}
                  onChange={(event) => setDiscordWebhook(event.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="font-mono text-xs"
                />
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

              <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-xs">
                    <Bot className="h-4 w-4 text-primary" />
                    Bot Telegram
                  </Label>
                  <Switch checked={enableTelegram} onCheckedChange={setEnableTelegram} />
                </div>
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={telegramToken}
                    onChange={(event) => setTelegramToken(event.target.value)}
                    placeholder="Bot API Token (ex: 123456:ABC-DEF1234...)"
                    className="font-mono text-xs"
                  />
                  <Input
                    type="text"
                    value={telegramChatId}
                    onChange={(event) => setTelegramChatId(event.target.value)}
                    placeholder="Chat ID ou @canal"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {testResult && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testResult}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>Sistema anti-bot & conexão de dados</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Modo anti-bot</Label>
                  <Switch checked={useAntiBot} onCheckedChange={setUseAntiBot} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Garante que a captura de dados funcione continuamente em sites com proteções de acesso.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Navegação fluida</Label>
                  <Switch checked={humanizePointer} onCheckedChange={setHumanizePointer} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simula interações naturais durante a requisição de informações.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-4">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Intervalo (segundos)
                </Label>
                <Input
                  type="number"
                  min={15}
                  max={600}
                  value={scrapingInterval}
                  onChange={(event) => setScrapingInterval(Number(event.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
