import { useState } from "react";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const notificationTypes = [
  { value: "info", label: "Informação", icon: Info, color: "text-blue-500" },
  { value: "success", label: "Sucesso", icon: CheckCircle, color: "text-green-500" },
  { value: "warning", label: "Aviso", icon: AlertTriangle, color: "text-yellow-500" },
  { value: "error", label: "Erro", icon: AlertCircle, color: "text-red-500" },
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
    
    // Limpar formulário
    setFormData({
      title: "",
      message: "",
      type: "info",
      expiresAt: "",
    });
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = notificationTypes.find(t => t.value === type);
    if (!typeInfo) return Info;
    return typeInfo.icon;
  };

  const getTypeColor = (type: string) => {
    const typeInfo = notificationTypes.find(t => t.value === type);
    return typeInfo?.color || "text-gray-500";
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Formulário de criação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Nova Notificação
          </CardTitle>
          <CardDescription>
            Envie avisos personalizados para todos os usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Manutenção programada"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                placeholder="Ex: O sistema ficará indisponível das 22h às 23h para manutenção"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                maxLength={500}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.message.length}/500 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data de expiração (opcional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Se não definir, a notificação não expira
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? "Enviando..." : "Enviar Notificação"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de notificações ativas */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações Ativas</CardTitle>
          <CardDescription>
            {notifications.length} notificação(ões) sendo exibida(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma notificação ativa</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = getTypeIcon(notification.type);
                const colorClass = getTypeColor(notification.type);

                return (
                  <div
                    key={notification.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Criada em: {format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {notification.expiresAt && (
                            <p className="text-xs text-muted-foreground">
                              Expira em: {format(new Date(notification.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(notification.id)}
                        disabled={isDeleting}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
