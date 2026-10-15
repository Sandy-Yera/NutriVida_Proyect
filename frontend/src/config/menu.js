export const menuPublico = [
  { texto: "Servicios", ruta: "/servicios" },
  { texto: "Planes", ruta: "/planes" },
  { texto: "Nosotros", ruta: "/nosotros" },
  { texto: "Consejos", ruta: "/consejos" },
  { texto: "Contacto", ruta: "/contacto" },
];

export const menuPorRol = {
  PACIENTE: [
    { texto: "Mis citas", ruta: "/mis-citas" },
    { texto: "Mi progreso", ruta: "/mi-progreso" },
  ],
  SECRETARIA: [{ texto: "Agenda", ruta: "/secretaria/agenda" }],
  NUTRICIONISTA: [
    { texto: "Mi agenda", ruta: "/nutricionista/agenda" },
    { texto: "Mis pacientes", ruta: "/nutricionista/pacientes" },
  ],
  ADMIN: [{ texto: "Panel", ruta: "/admin" }],
};

export function enlacesParaRol(rol) {
  return [...menuPublico, ...(menuPorRol[rol] ?? [])];
}

export const menuAdmin = [
  { texto: "Dashboard", ruta: "/admin", icono: "bi-speedometer2", exacta: true },
  {
    texto: "Usuarios",
    ruta: "/admin/usuarios",
    icono: "bi-people",
    descripcion: "Crear, editar, asignar rol y desactivar cuentas.",
  },
  {
    texto: "Citas",
    ruta: "/admin/citas",
    icono: "bi-calendar-check",
    descripcion: "Listado de citas y comprobantes de pago.",
  },
  {
    texto: "Servicios",
    ruta: "/admin/servicios",
    icono: "bi-clipboard2-pulse",
    descripcion: "Catálogo de consultas, planes, evaluaciones y talleres.",
  },
  {
    texto: "Reportes",
    ruta: "/admin/reportes",
    icono: "bi-bar-chart",
    descripcion: "Atenciones e inasistencia por período y por nutricionista.",
  },
];
