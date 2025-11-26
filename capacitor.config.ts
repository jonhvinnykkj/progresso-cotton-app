import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.progressocotton.app',
  appName: 'Progresso Cotton',
  webDir: 'dist',
  server: {
    // Allow cleartext (HTTP) for local development
    // Set to false in production with HTTPS
    cleartext: true,
    androidScheme: 'https',
    // Optional: Configure allowed navigation for security
    allowNavigation: [
      'https://cotton-manager-progresso.up.railway.app',
      'http://192.168.86.88:5000',
      'http://localhost:5000'
    ]
  }
};

export default config;
