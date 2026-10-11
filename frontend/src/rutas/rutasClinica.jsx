import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import RutaProtegida from "../components/comunes/RutaProtegida.jsx";
import Inicio from "../pages/clinica/Inicio.jsx";
import Servicios from "../pages/clinica/Servicios.jsx";
import DetalleServicio from "../pages/clinica/DetalleServicio.jsx";
import Planes from "../pages/clinica/Planes.jsx";
import Nosotros from "../pages/clinica/Nosotros.jsx";
import Contacto from "../pages/clinica/Contacto.jsx";
import MisPacientes from "../pages/clinica/MisPacientes.jsx";
import FichaPaciente from "../pages/clinica/FichaPaciente.jsx";
import AdminServicios from "../pages/clinica/admin/AdminServicios.jsx";
import ServicioFormulario from "../pages/clinica/admin/ServicioFormulario.jsx";

const MiProgreso = lazy(() => import("../pages/clinica/MiProgreso.jsx"));

export const rutasClinica = (
  <>
    <Route index element={<Inicio />} />
    <Route path="servicios" element={<Servicios />} />
    <Route path="servicios/categoria/:tipo" element={<Servicios />} />
    <Route path="servicios/:codigo" element={<DetalleServicio />} />
    <Route path="planes" element={<Planes />} />
    <Route path="nosotros" element={<Nosotros />} />
    <Route path="contacto" element={<Contacto />} />
    <Route
      path="mi-progreso"
      element={
        <RutaProtegida roles={["PACIENTE"]}>
          <Suspense
            fallback={
              <p className="container py-4" role="status">
                Cargando tu progreso...
              </p>
            }
          >
            <MiProgreso />
          </Suspense>
        </RutaProtegida>
      }
    />
    <Route
      path="nutricionista/pacientes"
      element={
        <RutaProtegida roles={["NUTRICIONISTA"]}>
          <MisPacientes />
        </RutaProtegida>
      }
    />
    <Route
      path="nutricionista/pacientes/:pacienteId"
      element={
        <RutaProtegida roles={["NUTRICIONISTA"]}>
          <FichaPaciente />
        </RutaProtegida>
      }
    />
  </>
);

export const rutasAdminClinica = (
  <>
    <Route path="servicios" element={<AdminServicios />} />
    <Route path="servicios/nuevo" element={<ServicioFormulario />} />
    <Route path="servicios/:codigo" element={<ServicioFormulario />} />
  </>
);
