import type { CapacitorConfig } from "@capacitor/cli";

// App nativa del CONDUCTOR (Android/iOS). El WebView carga el frontend desde
// `server.url` para no requerir export estático; los plugins nativos (como el
// rastreo en segundo plano) quedan disponibles dentro de ese WebView.
//
// Cambia CAPACITOR_SERVER_URL según el entorno:
//  - Emulador Android apuntando a tu PC: http://10.0.2.2:3000
//  - Dispositivo físico en tu red local: http://<IP-LAN-de-tu-PC>:3000
//  - Producción: https://rutasegura-frontend-dev.onrender.com
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  "https://rutasegura-frontend-dev.onrender.com";

const config: CapacitorConfig = {
  appId: "com.rutasegura.conductor",
  appName: "RutaSegura Conductor",
  // Carpeta de assets web (placeholder; con server.url el WebView usa la URL remota).
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  plugins: {
    // El plugin de background-geolocation gestiona permisos en runtime.
  },
};

export default config;
