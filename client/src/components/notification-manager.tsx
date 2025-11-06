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
    color: "text-blue-600",
    iconBg: "bg-blue-100",
    cardBg: "bg-blue-50/30",
    badgeBg: "bg-yellow-100 text-yellow-800"
  },
  { 
    value: "success", 
    label: "Sucesso", 
    icon: CheckCircle, 
    color: "text-green-600",
    iconBg: "bg-green-100",
    cardBg: "bg-green-50/30",
    badgeBg: "bg-green-100 text-green-800"
  },
  { 
    value: "warning", 
    label: "Aviso", 
    icon: AlertTriangle, 
    color: "text-yellow-600",
    iconBg: "bg-yellow-100",
    cardBg: "bg-yellow-50/30",
    badgeBg: "bg-yellow-100 text-yellow-800"
  },
  { 
    value: "error", 
    label: "Erro", 
    icon: AlertCircle, 
    color: "text-red-600",
    iconBg: "bg-red-100",
    cardBg: "bg-red-50/30",
    badgeBg: "bg-red-100 text-red-800"
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

  const getTypeInfo = (type: string) => {
    return notificationTypes.find(t => t.value === type) || notificationTypes[0];
  };

  return (
    <div className="space-y-8">
      {/* Header azul gradiente */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Bell className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Notificações do Sistema
            </h1>
            <p className="text-blue-50 text-base mt-1">
              Gerencie as notificações enviadas para todos os usuários
            </p>
          </div>
        </div>
      </div>

      {/* Grid com cards */}
      <div className="grid lg:grid-cols-2 gap-8">
            {/* Card: Nova Notificação */}
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardHeader className="pb-6 pt-8 px-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-green-100 rounded-lg">
                    <Send className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-800">Nova Notificação</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-500 ml-12">
                  Envie avisos personalizados para todos os usuários
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                      Título <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Ex: Manutenção programada"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      maxLength={100}
                      required
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="message" className="text-sm font-semibold text-gray-700">
                      Mensagem <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Ex: O sistema ficará indisponível das 22h às 23h para manutenção"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      maxLength={500}
                      rows={5}
                      required
                      className="resize-none text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-gray-500">
                        Máximo de 500 caracteres
                      </p>
                      <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs font-medium">
                        {formData.message.length}/500
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="type" className="text-sm font-semibold text-gray-700">
                      Tipo de Notificação
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2.5">
                              <div className={cn("p-1.5 rounded", type.iconBg)}>
                                <type.icon className={`h-4 w-4 ${type.color}`} />
                              </div>
                              <span className="text-base">{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="expiresAt" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data de Expiração (Opcional)
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Deixe vazio para notificação permanente
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all" 
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
              </CardContent>
            </Card>

            {/* Card: Notificações Ativas */}
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardHeader className="pb-6 pt-8 px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-800">Notificações Ativas</CardTitle>
                      <CardDescription className="text-sm text-gray-500 mt-0.5">
                        Gerenciar notificações em exibição
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-sm px-3.5 py-1.5 font-semibold">
                    {notifications.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center space-y-3">
                      <Bell className="h-10 w-10 text-gray-400 mx-auto animate-pulse" />
                      <p className="text-base text-gray-500 font-medium">Carregando...</p>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center space-y-3">
                      <Bell className="h-16 w-16 text-gray-300 mx-auto" />
                      <p className="text-base font-semibold text-gray-600">Nenhuma notificação ativa</p>
                      <p className="text-sm text-gray-500">
                        As notificações enviadas aparecerão aqui
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {notifications.map((notification) => {
                      const typeInfo = getTypeInfo(notification.type);
                      const Icon = typeInfo.icon;

                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "group relative rounded-xl border-0 p-5 transition-all hover:shadow-md",
                            typeInfo.cardBg
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn("p-3 rounded-lg shrink-0", typeInfo.iconBg)}>
                              <Icon className={`h-6 w-6 ${typeInfo.color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-bold text-lg leading-tight text-gray-800">
                                  {notification.title}
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteNotification(notification.id)}
                                  disabled={isDeleting}
                                  className="shrink-0 h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </Button>
                              </div>
                              
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {notification.message}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs font-medium">
                                  {typeInfo.label}
                                </Badge>
                                
                                <Badge variant="outline" className="text-xs gap-1.5 border-gray-300 text-gray-600">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(notification.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                </Badge>
                                
                                {notification.expiresAt && (
                                  <Badge variant="outline" className="text-xs gap-1.5 border-gray-300 text-gray-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    Expira {format(new Date(notification.expiresAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                                  </Badge>
                                )}
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
    </div>
  );
}
