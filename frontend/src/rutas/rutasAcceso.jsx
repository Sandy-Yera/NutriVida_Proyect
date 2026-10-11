import { Route } from "react-router-dom";
import Login from "../pages/acceso/Login.jsx";
import Registro from "../pages/acceso/Registro.jsx";
import Dashboard from "../pages/acceso/admin/Dashboard.jsx";

export const rutasAcceso = (
  <>
    <Route path="login" element={<Login />} />
    <Route path="registro" element={<Registro />} />
  </>
);

export const rutasAdminAcceso = (
  <>
    <Route index element={<Dashboard />} />
  </>
);
