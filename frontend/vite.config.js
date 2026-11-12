import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// En desarrollo, el proxy reparte /api/... al microservicio dueño de cada ruta (contrato EP3).
// El navegador solo habla con localhost:5173, así no necesita CORS y las rutas son las mismas
// que tendrá Nginx en el examen final.
const MS_USUARIOS = "http://localhost:8081";
const MS_CITAS = "http://localhost:8082";
const MS_CLINICA = "http://localhost:8083";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/auth": MS_USUARIOS,
      "/api/usuarios": MS_USUARIOS,
      "/api/articulos": MS_USUARIOS,
      "/api/citas": MS_CITAS,
      "/api/pagos": MS_CITAS,
      "/api/disponibilidad": MS_CITAS,
      "/api/servicios": MS_CLINICA,
      "/api/nutricionistas": MS_CLINICA,
      "/api/pacientes": MS_CLINICA,
      "/api/contactos": MS_CLINICA,
    },
  },
});
