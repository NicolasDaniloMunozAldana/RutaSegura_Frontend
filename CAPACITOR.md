# App nativa del conductor (Capacitor) — Android e iOS

La app del conductor es el **mismo frontend** envuelto con Capacitor. El WebView
carga la web desde `server.url` (ver `capacitor.config.ts`) y suma el plugin de
**rastreo en segundo plano**, de modo que la ubicación del bus se sigue enviando
aunque Google Maps esté en primer plano.

> El código web ya detecta si corre en nativo (`Capacitor.isNativePlatform()`).
> En nativo usa `@capacitor-community/background-geolocation`; en navegador usa
> `navigator.geolocation.watchPosition`. No hay que tocar el código para esto.

## 1. Requisitos (en tu máquina)
- Node + el frontend instalado (`npm install` ya trae `@capacitor/*`).
- **Android**: Android Studio + JDK 17.
- **iOS**: macOS + Xcode + CocoaPods.

## 2. Agregar las plataformas (una sola vez)
```bash
cd rutasegura_frontend
npx cap add android
npx cap add ios     # solo en macOS
```

## 3. Apuntar el WebView a tu backend/front
- Edita `CAPACITOR_SERVER_URL` (o el default en `capacitor.config.ts`):
  - Emulador Android → `http://10.0.2.2:3000`
  - Celular físico en tu red → `http://TU_IP_LAN:3000`
  - Producción → la URL pública del frontend.
- Asegúrate de que `NEXT_PUBLIC_API_URL` del frontend apunte a un backend
  **accesible desde el celular** (no `localhost`). El origen del WebView debe
  estar en el CORS del backend (`FRONTEND_URL`).
- Sincroniza: `npx cap sync`

## 4. Permisos nativos (rastreo en segundo plano)

### Android — `android/app/src/main/AndroidManifest.xml`
Dentro de `<manifest>`:
```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```
(El plugin registra su `foreground service`; mantiene una notificación
persistente "Viaje en curso" mientras se comparte la ubicación.)

### iOS — `ios/App/App/Info.plist`
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>RutaSegura usa tu ubicación para mostrar el bus a los acudientes.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>RutaSegura comparte la ubicación del bus durante el viaje, incluso en segundo plano.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

## 5. Compilar / ejecutar
```bash
npx cap open android     # abre Android Studio -> Run
npx cap open ios         # abre Xcode -> Run
```

## Notas
- Solo el **conductor** necesita la app nativa (por el rastreo en segundo plano).
  Coordinadores y acudientes usan la web normal.
- Al iniciar un viaje, la app abre Google Maps en modo navegación (voz/3D) y el
  plugin sigue enviando la ubicación cada ~12 s al backend
  (`PATCH /driver/trips/:id/location`).
- El backend NestJS **no cambia** para esto.
