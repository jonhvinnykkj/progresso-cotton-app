import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "app_version";

interface VersionResponse {
  version: string;
  timestamp: number;
}

export function useVersionCheck() {
  const { toast } = useToast();
  const currentVersion = useRef<string | null>(null);
  const toastShown = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    async function initVersionCheck() {
      try {
        // Get initial version
        const response = await fetch("/api/version");
        if (!response.ok) return;

        const data: VersionResponse = await response.json();
        currentVersion.current = data.version;
        localStorage.setItem(STORAGE_KEY, data.version);

        // Connect to SSE for real-time version updates
        const eventSource = new EventSource("/api/events");
        eventSourceRef.current = eventSource;

        // Listen for version-update events
        eventSource.addEventListener("version-update", async (event) => {
          const newVersion = JSON.parse(event.data).version;

          if (currentVersion.current !== newVersion && !toastShown.current) {
            toastShown.current = true;

            toast({
              title: "🎉 Nova versão disponível!",
              description: "Uma atualização está disponível. A página será recarregada automaticamente em 5 segundos.",
              duration: 5000,
            });

            // Auto-reload after 5 seconds
            setTimeout(() => {
              // Clear cache and reload
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              window.location.reload();
            }, 5000);
          }
        });

        eventSource.onerror = () => {
          console.log("SSE connection closed, version check will retry on reconnect");
        };

      } catch (error) {
        console.error("Error initializing version check:", error);
      }
    }

    initVersionCheck();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [toast]);
}
