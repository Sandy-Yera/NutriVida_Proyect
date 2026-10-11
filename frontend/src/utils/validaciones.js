import { aFechaLocal } from "./formato.js";

const SOLO_LETRAS = /^[\p{L}\s'.-]+$/u;

export function validarTexto(valor, etiqueta = "Este campo", { min = 2, max = 50 } = {}) {
  const texto = String(valor ?? "").trim();
  if (texto === "") return `${etiqueta} es obligatorio.`;
  if (texto.length < min || texto.length > max) {
    return `${etiqueta} debe tener entre ${min} y ${max} caracteres.`;
  }
  if (!SOLO_LETRAS.test(texto)) return `${etiqueta} solo puede tener letras.`;
  return "";
}

export function validarCorreo(correo) {
  const texto = String(correo ?? "").trim();
  if (texto === "") return "Ingresa el correo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)) {
    return "El correo no es válido: usa el formato nombre@dominio.cl.";
  }
  return "";
}

export function calcularDigitoVerificador(cuerpo) {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resultado = 11 - (suma % 11);
  if (resultado === 11) return "0";
  if (resultado === 10) return "K";
  return String(resultado);
}

export function validarRut(rut) {
  const limpio = String(rut ?? "")
    .replace(/[.\s-]/g, "")
    .toUpperCase();
  if (limpio === "") return "Ingresa el RUT.";
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return "El RUT debe tener el formato 12.345.678-5.";
  const cuerpo = limpio.slice(0, -1);
  const digito = limpio.slice(-1);
  if (calcularDigitoVerificador(cuerpo) !== digito) {
    return "El RUT no es válido: revisa el dígito verificador.";
  }
  return "";
}

export function validarClave(clave) {
  const texto = String(clave ?? "");
  if (texto === "") return "Ingresa una contraseña.";
  if (texto.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-ZÁÉÍÓÚÑ]/.test(texto)) return "La contraseña debe incluir al menos una mayúscula.";
  if (!/\d/.test(texto)) return "La contraseña debe incluir al menos un número.";
  return "";
}

export function validarConfirmacion(clave, confirmacion) {
  if (!confirmacion) return "Repite la contraseña.";
  if (confirmacion !== clave) return "Las contraseñas no coinciden.";
  return "";
}

export function validarTelefono(telefono) {
  const limpio = String(telefono ?? "").replace(/\s/g, "");
  if (limpio === "") return "Ingresa el teléfono.";
  if (!/^\+569\d{8}$/.test(limpio)) {
    return "El teléfono debe ser un celular chileno: +56 9 y 8 dígitos.";
  }
  return "";
}

export function validarFechaNacimiento(fecha, hoy = new Date()) {
  if (!fecha) return "Ingresa la fecha de nacimiento.";
  const nacimiento = aFechaLocal(fecha);
  if (Number.isNaN(nacimiento.getTime())) return "La fecha de nacimiento no es válida.";
  if (nacimiento > hoy) return "La fecha de nacimiento no puede ser futura.";
  if (nacimiento.getFullYear() < 1900) return "Revisa el año de nacimiento.";
  return "";
}

export function validarRegistro(datos, hoy = new Date()) {
  const errores = {
    nombre: validarTexto(datos.nombre, "El nombre"),
    apellido: validarTexto(datos.apellido, "El apellido"),
    rut: validarRut(datos.rut),
    correo: validarCorreo(datos.correo),
    telefono: validarTelefono(datos.telefono),
    fechaNacimiento: validarFechaNacimiento(datos.fechaNacimiento, hoy),
    clave: validarClave(datos.clave),
    confirmacion: validarConfirmacion(datos.clave, datos.confirmacion),
    acepta: datos.acepta ? "" : "Debes aceptar el tratamiento de tus datos de salud.",
  };
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje !== ""));
}
