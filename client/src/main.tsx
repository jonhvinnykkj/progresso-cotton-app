import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./register-sw";

// Force clear favicon cache in development
if (import.meta.env.DEV) {
  // Remove all favicon link elements and re-add them to force reload
  const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
  faviconLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const newLink = link.cloneNode(true) as HTMLLinkElement;
      newLink.href = href.split('?')[0] + '?t=' + Date.now();
      link.parentNode?.removeChild(link);
      document.head.appendChild(newLink);
    }
  });
}

// Register service worker
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
