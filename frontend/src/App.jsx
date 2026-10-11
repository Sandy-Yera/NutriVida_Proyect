import { Route, Routes } from "react-router-dom";
import LayoutPrincipal from "./layouts/LayoutPrincipal.jsx";
import LayoutAdmin from "./layouts/LayoutAdmin.jsx";
import RutaProtegida from "./components/comunes/RutaProtegida.jsx";
import { rutasAcceso, rutasAdminAcceso } from "./rutas/rutasAcceso.jsx";
import { rutasCitas, rutasAdminCitas } from "./rutas/rutasCitas.jsx";
import { rutasClinica, rutasAdminClinica } from "./rutas/rutasClinica.jsx";
import NoEncontrada from "./pages/acceso/NoEncontrada.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<LayoutPrincipal />}>
        {rutasClinica}
        {rutasCitas}
        {rutasAcceso}
        <Route path="*" element={<NoEncontrada />} />
      </Route>
      <Route
        path="admin"
        element={
          <RutaProtegida roles={["ADMIN"]}>
            <LayoutAdmin />
          </RutaProtegida>
        }
      >
        {rutasAdminAcceso}
        {rutasAdminCitas}
        {rutasAdminClinica}
      </Route>
    </Routes>
  );
}
