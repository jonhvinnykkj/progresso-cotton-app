import { useState } from "react";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const notificationTypes = [
  {
    value: "info",
    label: "Informação",
    icon: Info,
    color: "#3B82F6",
    bgColor: "bg-blue-500",
  },
  {
    value: "success",
    label: "Sucesso",
    icon: CheckCircle,
    color: "#22C55E",
    bgColor: "bg-green-500",
  },
  {
    value: "warning",
    label: "Aviso",
    icon: AlertTriangle,
    color: "#F59E0B",
    bgColor: "bg-amber-500",
  },
  {
    value: "error",
    label: "Erro",
    icon: AlertCircle,
    color: "#EF4444",
    bgColor: "bg-red-500",
  },
];

export function NotificationManager() {
  const { notifications, isLoading, createNotification, deleteNotification, isCreating, isDeleting } = useAdminNotifications();

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "success" | "error",
    expiresAt: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      title: formData.title,
      message: formData.message,
      type: formData.type,
    };

    if (formData.expiresAt) {
      data.expiresAt = new Date(formData.expiresAt).toISOString();
    }

    createNotification(data);

    setFormData({
      title: "",
      message: "",
      type: "info",
      expiresAt: "",
    });
  };

  const getTypeInfo = (type: string) => {
    return notificationTypes.find(t => t.value === type) || notificationTypes[0];
  };

  return (
    <div className="space-y-6">
      {/* iOS-style Header */}
      <div className="flex items-center gap-4 pb-2">
        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
          <Bell className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold">Notificações</h1>
          <p className="text-[15px] text-muted-foreground">
            Gerencie os avisos do sistema
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Card: Nova Notificação */}
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold">Nova Notificação</h2>
              <p className="text-[13px] text-muted-foreground">Envie avisos aos usuários</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[13px] font-medium text-muted-foreground">
                TÍTULO
              </Label>
              <Input
                id="title"
                placeholder="Ex: Manutenção programada"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
                required
                className="h-12 rounded-xl bg-surface border-0 text-[15px]"
              />
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-[13px] font-medium text-muted-foreground">
                MENSAGEM
              </Label>
              <Textarea
                id="message"
                placeholder="Descreva a notificação..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                maxLength={500}
                rows={4}
                required
                className="resize-none rounded-xl bg-surface border-0 text-[15px]"
              />
              <p className="text-[12px] text-muted-foreground text-right">
                {formData.message.length}/500
              </p>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-muted-foreground">
                TIPO
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-surface border-0 text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", type.bgColor)}>
                          <type.icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de Expiração */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="text-[13px] font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                EXPIRAÇÃO (OPCIONAL)
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="h-12 rounded-xl bg-surface border-0 text-[15px]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-[15px] font-semibold rounded-xl bg-green-600 hover:bg-green-700"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Bell className="mr-2 h-5 w-5 animate-pulse" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Notificação
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Card: Notificações Ativas */}
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold">Ativas</h2>
                <p className="text-[13px] text-muted-foreground">
                  {notifications.length} {notifications.length === 1 ? 'notificação' : 'notificações'}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto animate-pulse" />
                <p className="text-[15px] text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mx-auto">
                  <Bell className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-[15px] font-medium text-muted-foreground">Nenhuma notificação</p>
                <p className="text-[13px] text-muted-foreground/70">
                  Crie uma notificação ao lado
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {notifications.map((notification) => {
                const typeInfo = getTypeInfo(notification.type);
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={notification.id}
                    className="group relative flex items-start gap-3 p-4 rounded-xl bg-surface transition-colors hover:bg-surface-hover"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      typeInfo.bgColor
                    )}>
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-foreground truncate pr-8">
                        {notification.title}
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-2">
                        {format(new Date(notification.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                        {notification.expiresAt && (
                          <span className="ml-2">
                            · Expira {format(new Date(notification.expiresAt), "dd MMM", { locale: ptBR })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification(notification.id)}
                      disabled={isDeleting}
                      className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
