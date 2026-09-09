import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@components/ui/dialog";
import { Button } from "@components/ui/button";
import type { ServerConfig } from "@types";

interface ConfirmDeleteServerDialogProps {
  server: ServerConfig | null;
  onCancel: () => void;
  onConfirm: (serverId: string) => void;
}

export const ConfirmDeleteServerDialog: React.FC<ConfirmDeleteServerDialogProps> = ({
  server,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={!!server} onOpenChange={(open) => !open && onCancel()}>
    <DialogContent className="sm:max-w-md">
      {server && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Remover servidor
            </DialogTitle>
            <DialogDescription>
              Tem certeza que quer remover <strong className="text-foreground">{server.serverName}</strong>? O
              histórico de personagens e configurações desse servidor será perdido. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onConfirm(server.serverId)}
            >
              Remover
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);
