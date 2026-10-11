import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import Login from "../pages/acceso/Login.jsx";
import Registro from "../pages/acceso/Registro.jsx";
import Dashboard from "../pages/acceso/admin/Dashboard.jsx";
import AdminUsuarios from "../pages/acceso/admin/AdminUsuarios.jsx";
import UsuarioFormulario from "../pages/acceso/admin/UsuarioFormulario.jsx";

const Reportes = lazy(() => import("../pages/acceso/admin/Reportes.jsx"));

export const rutasAcceso = (
  <>
    <Route path="login" element={<Login />} />
    <Route path="registro" element={<Registro />} />
  </>
);

export const rutasAdminAcceso = (
  <>
    <Route index element={<Dashboard />} />
    <Route path="usuarios" element={<AdminUsuarios />} />
    <Route path="usuarios/nuevo" element={<UsuarioFormulario />} />
    <Route path="usuarios/:id" element={<UsuarioFormulario />} />
    <Route
      path="reportes"
      element={
        <Suspense fallback={<p role="status">Cargando reportes...</p>}>
          <Reportes />
        </Suspense>
      }
    />
  </>
);
