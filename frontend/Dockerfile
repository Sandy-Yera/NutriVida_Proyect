# Frontend NutriVida: se compila con Node dentro de Docker y se sirve con Nginx.
# Etapa 1 (build): instala exactamente lo del package-lock.json y genera dist/.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Modo dual: en Docker, por defecto, los services llaman a la API (VITE_API_MODE=api).
# Las variables VITE_ se leen al compilar, por eso van como ARG y no al arrancar el contenedor.
ARG VITE_API_MODE=api
ENV VITE_API_MODE=$VITE_API_MODE \
    VITE_API_URL=
RUN npm run build

# Etapa 2 (runtime): Nginx sirve los archivos estáticos y hace de proxy hacia /api.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
