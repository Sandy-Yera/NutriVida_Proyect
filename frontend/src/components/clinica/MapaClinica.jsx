import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import iconoMarcador from "leaflet/dist/images/marker-icon.png";
import iconoMarcadorRetina from "leaflet/dist/images/marker-icon-2x.png";
import sombraMarcador from "leaflet/dist/images/marker-shadow.png";
import { INFO_CLINICA, URL_COMO_LLEGAR } from "../../data/infoClinica.js";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: iconoMarcador,
  iconRetinaUrl: iconoMarcadorRetina,
  shadowUrl: sombraMarcador,
});

export default function MapaClinica({ alto = 320, zoom = 16 }) {
  const posicion = [INFO_CLINICA.latitud, INFO_CLINICA.longitud];

  return (
    <div
      className="border rounded-3 overflow-hidden"
      role="region"
      aria-label="Mapa con la ubicación de la clínica"
    >
      <MapContainer
        center={posicion}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: alto, width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={posicion}>
          <Popup>
            <strong>{INFO_CLINICA.nombre}</strong>
            <br />
            {INFO_CLINICA.direccion}
            <br />
            <a href={URL_COMO_LLEGAR} target="_blank" rel="noopener noreferrer">
              Cómo llegar
            </a>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
