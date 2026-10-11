import { Route } from "react-router-dom";
import Inicio from "../pages/clinica/Inicio.jsx";
import Servicios from "../pages/clinica/Servicios.jsx";
import DetalleServicio from "../pages/clinica/DetalleServicio.jsx";
import Planes from "../pages/clinica/Planes.jsx";
import Nosotros from "../pages/clinica/Nosotros.jsx";
import AdminServicios from "../pages/clinica/admin/AdminServicios.jsx";

export const rutasClinica = (
  <>
    <Route index element={<Inicio />} />
    <Route path="servicios" element={<Servicios />} />
    <Route path="servicios/categoria/:tipo" element={<Servicios />} />
    <Route path="servicios/:codigo" element={<DetalleServicio />} />
    <Route path="planes" element={<Planes />} />
    <Route path="nosotros" element={<Nosotros />} />
  </>
);

export const rutasAdminClinica = (
  <>
    <Route path="servicios" element={<AdminServicios />} />
  </>
);
