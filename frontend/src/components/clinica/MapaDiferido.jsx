import { lazy, Suspense } from "react";

const MapaClinica = lazy(() => import("./MapaClinica.jsx"));

export default function MapaDiferido({ alto = 320 }) {
  return (
    <Suspense
      fallback={
        <div
          className="border rounded-3 bg-white d-flex align-items-center justify-content-center small text-body-secondary"
          style={{ height: alto }}
          role="status"
        >
          Cargando mapa...
        </div>
      }
    >
      <MapaClinica alto={alto} />
    </Suspense>
  );
}
