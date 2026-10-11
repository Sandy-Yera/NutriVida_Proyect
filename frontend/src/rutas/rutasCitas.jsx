import { Route } from "react-router-dom";
import RutaProtegida from "../components/comunes/RutaProtegida.jsx";
import SolicitarCita from "../pages/citas/SolicitarCita.jsx";
import AdminCitas from "../pages/citas/admin/AdminCitas.jsx";

export const rutasCitas = (
  <>
    <Route
      path="citas/solicitar"
      element={
        <RutaProtegida roles={["PACIENTE"]}>
          <SolicitarCita />
        </RutaProtegida>
      }
    />
  </>
);

export const rutasAdminCitas = (
  <>
    <Route path="citas" element={<AdminCitas />} />
  </>
);
