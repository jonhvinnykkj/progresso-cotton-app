import { useState } from "react";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle, Send, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const notificationTypes = [
  { 
    value: "info", 
    label: "Informação", 
    icon: Info, 
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
  },
  { 
    value: "success", 
    label: "Sucesso", 
    icon: CheckCircle, 
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
  },
  { 
    value: "warning", 
    label: "Aviso", 
    icon: AlertTriangle, 
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  },
  { 
    value: "error", 
    label: "Erro", 
    icon: AlertCircle, 
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
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

  const getTypeInfo = (type: string) => {
    return notificationTypes.find(t => t.value === type) || notificationTypes[0];
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário de criação */}
      <Card className="border-2">
        <CardHeader className="space-y-1 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Nova Notificação</CardTitle>
              <CardDescription className="text-sm">
                Envie avisos personalizados para todos os usuários
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Manutenção programada"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-semibold">
                Mensagem <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Ex: O sistema ficará indisponível das 22h às 23h para manutenção"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                maxLength={500}
                rows={4}
                required
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Máximo de 500 caracteres
                </p>
                <Badge variant="outline" className="text-xs">
                  {formData.message.length}/500
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-semibold">
                Tipo de Notificação
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Data de Expiração (Opcional)
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para notificação permanente
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold" 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Bell className="mr-2 h-4 w-4 animate-pulse" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Notificação
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de notificações ativas */}
      <Card className="border-2">
        <CardHeader className="space-y-1 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Notificações Ativas</CardTitle>
                <CardDescription className="text-sm">
                  Gerenciar notificações em exibição
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {notifications.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma notificação ativa</p>
                <p className="text-xs text-muted-foreground">
                  As notificações enviadas aparecerão aqui
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {notifications.map((notification) => {
                const typeInfo = getTypeInfo(notification.type);
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative rounded-lg border-2 p-4 transition-all hover:shadow-md",
                      typeInfo.border,
                      typeInfo.bg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg shrink-0", typeInfo.badge)}>
                        <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-base leading-tight">
                            {notification.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteNotification(notification.id)}
                            disabled={isDeleting}
                            className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {notification.message}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(notification.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </Badge>
                          
                          {notification.expiresAt && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              Expira {format(new Date(notification.expiresAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </Badge>
                          )}
                          
                          <Badge className={cn("text-xs", typeInfo.badge)}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
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
