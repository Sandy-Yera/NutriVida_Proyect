export const INFO_CLINICA = {
  nombre: "Clínica Nutricional NutriVida",
  direccion: "Sector Plaza Aníbal Pinto, Temuco",
  region: "Región de La Araucanía",
  latitud: -38.739,
  longitud: -72.599,
  horario: [
    { dias: "Lunes a viernes", horas: "08:00 a 19:00" },
    { dias: "Sábado", horas: "09:00 a 14:00" },
  ],
  telefono: "+56 45 200 0000",
  correo: "contacto@nutrivida.cl",
};

export const URL_COMO_LLEGAR = `https://www.google.com/maps/dir/?api=1&destination=${INFO_CLINICA.latitud},${INFO_CLINICA.longitud}`;
