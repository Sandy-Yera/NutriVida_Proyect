function diaHabil(dias, n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  while (!dias.includes(d.getDay())) d.setDate(d.getDate() + 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const L_V = [1, 2, 3, 4, 5];
const M_V = [2, 3, 4, 5];
const LMV = [1, 3, 5];
const MJS = [2, 4, 6];

export const citasSemilla = [
  {
    id: "C0001",
    pacienteId: "U100",
    nutricionistaId: "NUT001",
    servicioCodigo: "CN002",
    fecha: diaHabil(LMV, -35),
    hora: "10:00",
    duracionMin: 30,
    motivo: "Control mensual de peso",
    estado: "ATENDIDA",
    pagoId: "P0001",
    historial: [],
    creadaEn: "2026-08-01",
  },
  {
    id: "C0002",
    pacienteId: "U101",
    nutricionistaId: "NUT002",
    servicioCodigo: "CN001",
    fecha: diaHabil(MJS, -9),
    hora: "09:00",
    duracionMin: 50,
    motivo: "Plan de alimentación para preparar un maratón",
    estado: "INASISTENCIA",
    pagoId: "P0002",
    historial: [],
    creadaEn: "2026-08-01",
  },
  {
    id: "C0003",
    pacienteId: "U100",
    nutricionistaId: "NUT001",
    servicioCodigo: "CN002",
    fecha: diaHabil(LMV, 1),
    hora: "11:00",
    duracionMin: 30,
    motivo: "Control mensual de peso",
    estado: "CONFIRMADA",
    pagoId: "P0003",
    historial: [],
    creadaEn: "2026-08-01",
  },
  {
    id: "C0004",
    pacienteId: "U102",
    nutricionistaId: "NUT003",
    servicioCodigo: "CN001",
    fecha: diaHabil(LV, 2),
    hora: "08:30",
    duracionMin: 50,
    motivo: "Quiero empezar una alimentación vegana",
    estado: "PENDIENTE",
    pagoId: "P0004",
    historial: [],
    creadaEn: "2026-08-01",
  },
  {
    id: "C0005",
    pacienteId: "U101",
    nutricionistaId: "NUT002",
    servicioCodigo: "CN002",
    fecha: diaHabil(MJS, 3),
    hora: "10:00",
    duracionMin: 30,
    motivo: "Control deportivo",
    estado: "PENDIENTE",
    pagoId: "P0005",
    historial: [],
    creadaEn: "2026-08-01",
  },
];
