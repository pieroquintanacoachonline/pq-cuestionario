# 🚀 Guía de Despliegue en Cloudflare Pages · Cuestionario Inicial del Atleta

Esta aplicación web fue diseñada para brindarle a tus atletas una experiencia **ultra profesional, moderna y personalizada**, sustituyendo formularios genéricos por el **Cuestionario Inicial del Atleta** con la identidad oficial de **PQ Coach Online**.

---

## 📁 Archivos de la Aplicación Web
La carpeta lista para desplegar está en:  
`c:\Users\51990\Documents\ANTIGRAVITY\pq-coach-onboarding-web`

Contiene:
* **`index.html`**: Cuestionario interactivo en 5 pasos (Multi-step) con barra de progreso, logo oficial PQ y animación de confeti.
* **`styles.css`**: Diseño moderno en tema Dark con el azul corporativo (`#002875`), efectos glassmorphism y 100% adaptado a celulares.
* **`app.js`**: Controlador de navegación, validaciones y sincronización con Google Sheets.
* **`logo.png`**: Logo oficial transparente de PQ Coach.

---

## ⚡ Cómo Desplegar en Cloudflare Pages en 1 Minuto (100% GRATIS)

1. Ingresa a tu cuenta en [dash.cloudflare.com](https://dash.cloudflare.com).
2. En el menú lateral izquierdo, haz clic en **Workers & Pages**.
3. Haz clic en el botón azul **Create application** (Crear aplicación).
4. Selecciona la pestaña **Pages** y elige la opción **Upload assets** (Subir archivos directamente).
5. Asigna un nombre a tu proyecto (ejemplo: `pq-cuestionario` o `pq-coach`).
6. **Arrastra y suelta** la carpeta `pq-coach-onboarding-web` en el recuadro de Cloudflare.
7. Haz clic en **Deploy site** (Desplegar sitio).

¡Listo! En 5 segundos tendrás tu enlace público oficial gratuito:  
👉 `https://pq-cuestionario.pages.dev` (o `https://pq-coach.pages.dev`).

---

## 🔗 Cómo Conectar la Web a tu Google Sheets

1. En tu Google Sheets, ve a **Extensiones > Apps Script**.
2. Pega el código actualizado de `PQ_Coach_Master.gs` (ya incluye la función `doPost`).
3. En la esquina superior derecha de Apps Script, haz clic en **Implementar > Nueva implementación**.
4. En el icono de engranaje (⚙️), selecciona **Aplicación web**.
5. Configura lo siguiente:
   * **Descripción:** `Conexión Cuestionario Inicial PQ`
   * **Ejecutar como:** `Yo (tu correo de Google)`
   * **Quién tiene acceso:** `Cualquier usuario (Anyone)` *(Indispensable para que los atletas puedan enviar sus respuestas desde la web sin necesidad de iniciar sesión en Google)*.
6. Haz clic en **Implementar** y copia la **URL de la aplicación web**.
7. En el archivo `app.js` (línea 8), pega esa URL dentro de las comillas:
   ```javascript
   let SPREADSHEET_WEBHOOK_URL = "TU_URL_DE_APPS_SCRIPT_AQUI";
   ```
8. Arrastras de nuevo la carpeta a Cloudflare (Deploy) y tu Cuestionario Inicial quedará conectado de por vida a tu Google Sheets.
