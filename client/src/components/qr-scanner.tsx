import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ScanLine, AlertCircle, Camera } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "qr-reader";

  useEffect(() => {
    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log('📷 QR Code escaneado:', {
            texto: decodedText,
            length: decodedText.length,
            trimmed: decodedText.trim(),
            chars: decodedText.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
          });
          onScan(decodedText);
          stopScanning();
        },
        undefined
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      
      // Identificar o tipo de erro
      let errorMessage = "Erro ao acessar a câmera";
      
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        errorMessage = "Permissão da câmera negada. Por favor, permita o acesso à câmera nas configurações do seu navegador.";
      } else if (err.name === "NotFoundError" || err.message?.includes("not found")) {
        errorMessage = "Nenhuma câmera encontrada no dispositivo.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "A câmera está sendo usada por outro aplicativo. Feche outros apps que possam estar usando a câmera.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ScanLine className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-white">Escanear QR Code</h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          className="text-white hover:bg-white/10"
          data-testid="button-close-scanner"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-white/20 p-6">
          <div id={elementId} className="w-full rounded-lg overflow-hidden" />
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao acessar câmera</AlertTitle>
              <AlertDescription className="mt-2">
                {error}
              </AlertDescription>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <p className="font-medium">Para permitir o acesso:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Toque no ícone de cadeado ou informações na barra de endereço</li>
                  <li>Procure por "Câmera" ou "Permissões"</li>
                  <li>Altere a permissão para "Permitir"</li>
                  <li>Recarregue a página e tente novamente</li>
                </ol>
              </div>
              <Button
                onClick={() => {
                  setError(null);
                  startScanning();
                }}
                className="mt-4 w-full"
                variant="outline"
              >
                <Camera className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </Alert>
          )}
          
          {isScanning && !error && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Aponte a câmera para o QR Code do fardo
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <p className="text-xs text-primary font-medium">Escaneando...</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
