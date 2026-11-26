// Foto de perfil de los nutricionistas: reglas compartidas por el formulario y el service.
// En EP3 las mismas reglas las aplica ms-clinica al recibir el multipart (415 y 413).

export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES_FOTO = 2 * 1024 * 1024; // 2 MB, igual que spring.servlet.multipart.max-file-size
export const LADO_MAX_FOTO = 320; // px: se guarda reducida para no llenar el localStorage

// Devuelve "" si el archivo sirve o el mensaje de error, como las demás validaciones.
export function validarArchivoFoto(archivo) {
  if (!archivo) return "Elige una imagen.";
  if (!TIPOS_FOTO.includes(archivo.type)) return "La foto debe ser JPG, PNG o WebP.";
  if (archivo.size > MAX_BYTES_FOTO) return "La foto puede pesar como máximo 2 MB.";
  return "";
}

// Iniciales para cuando no hay foto: "Carolina Fuentes M." → "CF".
export function iniciales(nombre) {
  return String(nombre ?? "")
    .split(/\s+/)
    .filter((parte) => /^\p{L}/u.test(parte) && !parte.endsWith("."))
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

export function leerComoDataUrl(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(new Error("No pudimos leer la imagen."));
    lector.readAsDataURL(archivo);
  });
}

// Medidas finales: el lado mayor queda en LADO_MAX_FOTO como máximo, sin agrandar.
export function medidasReducidas(ancho, alto, ladoMax = LADO_MAX_FOTO) {
  const escala = Math.min(1, ladoMax / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

// Convierte el archivo en una imagen data: reducida (JPEG). Si el navegador no puede dibujarla
// (por ejemplo en jsdom, durante las pruebas), guarda el archivo tal cual: ya pasó el límite de 2 MB.
export async function prepararFoto(archivo) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return leerComoDataUrl(archivo);
  }
  try {
    const imagen = await createImageBitmap(archivo);
    const { ancho, alto } = medidasReducidas(imagen.width, imagen.height);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    if (!contexto) return leerComoDataUrl(archivo);
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    imagen.close?.();
    return lienzo.toDataURL("image/jpeg", 0.85);
  } catch {
    return leerComoDataUrl(archivo);
  }
}
