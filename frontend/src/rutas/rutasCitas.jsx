import { Route } from "react-router-dom";
import RutaProtegida from "../components/comunes/RutaProtegida.jsx";
import SolicitarCita from "../pages/citas/SolicitarCita.jsx";
import Pago from "../pages/citas/Pago.jsx";
import PagoExitoso from "../pages/citas/PagoExitoso.jsx";
import PagoError from "../pages/citas/PagoError.jsx";
import MisCitas from "../pages/citas/MisCitas.jsx";
import AgendaSecretaria from "../pages/citas/AgendaSecretaria.jsx";
import AgendaNutricionista from "../pages/citas/AgendaNutricionista.jsx";
import AdminCitas from "../pages/citas/admin/AdminCitas.jsx";
import AdminCitaDetalle from "../pages/citas/admin/AdminCitaDetalle.jsx";

function protegida(roles, elemento) {
  return <RutaProtegida roles={roles}>{elemento}</RutaProtegida>;
}

export const rutasCitas = (
  <>
    <Route path="citas/solicitar" element={protegida(["PACIENTE"], <SolicitarCita />)} />
    <Route path="citas/pago" element={protegida(["PACIENTE"], <Pago />)} />
    <Route path="citas/pago/exito/:citaId" element={protegida(["PACIENTE"], <PagoExitoso />)} />
    <Route path="citas/pago/error" element={protegida(["PACIENTE"], <PagoError />)} />
    <Route path="mis-citas" element={protegida(["PACIENTE"], <MisCitas />)} />
    <Route path="secretaria/agenda" element={protegida(["SECRETARIA", "ADMIN"], <AgendaSecretaria />)} />
    <Route path="nutricionista/agenda" element={protegida(["NUTRICIONISTA"], <AgendaNutricionista />)} />
  </>
);

// Sin prefijo /admin ni RutaProtegida: LayoutAdmin ya exige el rol ADMIN.
export const rutasAdminCitas = (
  <>
    <Route path="citas" element={<AdminCitas />} />
    <Route path="citas/:id" element={<AdminCitaDetalle />} />
  </>
);