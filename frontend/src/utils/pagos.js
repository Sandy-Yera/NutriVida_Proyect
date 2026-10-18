// RN-18 y RN-19: validaciones y simulación del pago.
// Las validaciones devuelven "" si el dato es válido o el mensaje de error, como validarClave.

const TARJETA_RECHAZADA = "4000000000000002";

export function soloDigitos(texto) {
  return String(texto ?? "").replace(/\D/g, "");
}

// Algoritmo de Luhn: desde el último dígito, se duplica uno de cada dos;
// si el doble pasa de 9 se le resta 9. La suma total debe ser múltiplo de 10.
export function pasaLuhn(digitos) {
  let suma = 0;
  let duplicar = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = Number(digitos[i]);
    if (duplicar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

export function validarTitular(titular) {
  const texto = String(titular ?? "").trim();
  if (!texto) return "Ingresa el nombre del titular.";
  if (texto.length < 3) return "El nombre del titular debe tener al menos 3 letras.";
  return "";
}

export function validarTarjeta(numero) {
  const digitos = soloDigitos(numero);
  if (!digitos) return "Ingresa el número de la tarjeta.";
  if (digitos.length !== 16) return "El número de la tarjeta debe tener 16 dígitos.";
  if (!pasaLuhn(digitos)) return "El número de la tarjeta no es válido. Revísalo.";
  return "";
}

// Una tarjeta MM/AA vence al terminar ese mes. ahora llega por parámetro (RN-30).
export function validarVencimiento(texto, ahora = new Date()) {
  const valor = String(texto ?? "").trim();
  if (!valor) return "Ingresa el vencimiento.";
  const partes = /^(\d{2})\/(\d{2})$/.exec(valor);
  if (!partes) return "Escribe el vencimiento como MM/AA.";
  const mes = Number(partes[1]);
  if (mes < 1 || mes > 12) return "El mes del vencimiento debe estar entre 01 y 12.";
  const vence = (2000 + Number(partes[2])) * 12 + (mes - 1);
  const actual = ahora.getFullYear() * 12 + ahora.getMonth();
  if (vence < actual) return "La tarjeta está vencida.";
  return "";
}

export function validarCvv(cvv) {
  const valor = String(cvv ?? "").trim();
  if (!valor) return "Ingresa el CVV.";
  if (!/^\d{3}$/.test(valor)) return "El CVV debe tener 3 dígitos.";
  return "";
}

// Junta las cuatro validaciones en un objeto { campo: mensaje }, como validarMedicion.
export function validarPago({ titular, numero, vencimiento, cvv }, ahora = new Date()) {
  const errores = {};
  const mensajes = {
    titular: validarTitular(titular),
    numero: validarTarjeta(numero),
    vencimiento: validarVencimiento(vencimiento, ahora),
    cvv: validarCvv(cvv),
  };
  Object.entries(mensajes).forEach(([campo, mensaje]) => {
    if (mensaje) errores[campo] = mensaje;
  });
  return errores;
}

// RN-19: la tarjeta 4000 0000 0000 0002 se rechaza; cualquier otra válida se aprueba.
export function simularPago(numero) {
  if (soloDigitos(numero) === TARJETA_RECHAZADA) {
    return { estado: "RECHAZADO", motivo: "El banco rechazó la tarjeta." };
  }
  return { estado: "APROBADO", motivo: null };
}

// RN-27 (admin): total recaudado. Solo suman los pagos APROBADOS: un rechazo nunca se cobró
// y un reembolso se devolvió.
export function totalRecaudado(pagos) {
  return pagos.filter((p) => p.estado === "APROBADO").reduce((suma, p) => suma + p.monto, 0);
}
