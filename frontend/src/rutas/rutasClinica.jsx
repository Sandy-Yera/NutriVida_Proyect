import { Route } from "react-router-dom";
import Inicio from "../pages/clinica/Inicio.jsx";
import AdminServicios from "../pages/clinica/admin/AdminServicios.jsx";

export const rutasClinica = (
  <>
    <Route index element={<Inicio />} />
  </>
);

export const rutasAdminClinica = (
  <>
    <Route path="servicios" element={<AdminServicios />} />
  </>
);
