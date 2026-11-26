-- =============================================================================================
-- ms-clinica (Catalina) · esquema nutrivida_clinica
--
-- MySQL lo ejecuta una sola vez, al crear el volumen (docker-entrypoint-initdb.d), después de
-- 00_esquemas.sh. Para recargarlo: docker compose down -v y docker compose up -d --build.
-- ms-clinica arranca con ddl-auto=validate: las entidades JPA deben calzar con estas tablas.
--
-- Reglas del contrato (documentacion/ep3/contrato-backend.md):
-- - Sin claves foráneas entre esquemas: usuario_id y paciente_id son referencias por valor a
--   nutrivida_usuarios (§1).
-- - Mismos IDs que en EP2: NUT001…, CN001…, M0001…, PA001… (§1).
-- - La base es la última barrera: PK, UNIQUE y CHECK (§5).
-- =============================================================================================
USE nutrivida_clinica;
-- El cliente mysql del entrypoint lee el archivo como latin1: sin esto, "síndrome" queda como "sÃ­ndrome".
SET NAMES utf8mb4;

-- Catálogo (RF-CLI-01). duracion_min es NULL en los planes; cupo_max solo en talleres.
-- No se borra: se desactiva (activo = FALSE), porque las citas lo referencian por código.
CREATE TABLE servicio (
    codigo       VARCHAR(10)  NOT NULL,
    tipo         VARCHAR(12)  NOT NULL,
    nombre       VARCHAR(80)  NOT NULL,
    duracion_min INT          NULL,
    modalidad    VARCHAR(20)  NOT NULL,
    precio       INT          NOT NULL COMMENT 'Pesos chilenos, sin decimales.',
    descripcion  VARCHAR(300) NOT NULL,
    destacado    BOOLEAN      NOT NULL DEFAULT FALSE,
    cupo_max     INT          NULL,
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (codigo),
    CONSTRAINT ck_servicio_codigo    CHECK (codigo REGEXP '^[A-Z]{2}[0-9]{3}$'),
    CONSTRAINT ck_servicio_tipo      CHECK (tipo IN ('CONSULTA', 'PLAN', 'EVALUACION', 'TALLER')),
    CONSTRAINT ck_servicio_modalidad CHECK (modalidad IN ('Presencial', 'Online (video)', 'Presencial (grupo)')),
    CONSTRAINT ck_servicio_precio    CHECK (precio > 0),
    CONSTRAINT ck_servicio_duracion  CHECK (duracion_min IS NULL OR duracion_min BETWEEN 10 AND 240),
    CONSTRAINT ck_servicio_cupo      CHECK (cupo_max IS NULL OR cupo_max BETWEEN 1 AND 50)
) ENGINE = InnoDB;

-- Nutricionista y su jornada. ms-citas lee id, dias, hora_inicio y hora_fin (GET /api/nutricionistas).
CREATE TABLE nutricionista (
    id           VARCHAR(10)  NOT NULL,
    usuario_id   VARCHAR(10)  NOT NULL COMMENT 'Su cuenta en nutrivida_usuarios (por valor).',
    nombre       VARCHAR(80)  NOT NULL,
    especialidad VARCHAR(120) NOT NULL,
    hora_inicio  TIME         NOT NULL,
    hora_fin     TIME         NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_nutricionista_usuario UNIQUE (usuario_id),
    CONSTRAINT ck_nutricionista_jornada CHECK (hora_inicio < hora_fin)
) ENGINE = InnoDB;

-- Días de atención en tabla aparte (1FN). Convención de EP2: 0 = domingo … 6 = sábado.
CREATE TABLE nutricionista_dia (
    nutricionista_id VARCHAR(10) NOT NULL,
    dia              INT         NOT NULL,
    PRIMARY KEY (nutricionista_id, dia),
    CONSTRAINT fk_dia_nutricionista FOREIGN KEY (nutricionista_id) REFERENCES nutricionista (id) ON DELETE CASCADE,
    CONSTRAINT ck_dia_rango CHECK (dia BETWEEN 0 AND 6)
) ENGINE = InnoDB;

-- Foto de perfil (JPG, PNG o WebP de hasta 2 MB). Aparte para no cargarla al listar el catálogo.
CREATE TABLE nutricionista_foto (
    nutricionista_id VARCHAR(10) NOT NULL,
    tipo             VARCHAR(20) NOT NULL,
    datos            LONGBLOB    NOT NULL,
    actualizada_en   DATETIME(6) NOT NULL COMMENT 'Instante en UTC; también sirve para invalidar la caché.',
    PRIMARY KEY (nutricionista_id),
    CONSTRAINT fk_foto_nutricionista FOREIGN KEY (nutricionista_id) REFERENCES nutricionista (id) ON DELETE CASCADE,
    CONSTRAINT ck_foto_tipo CHECK (tipo IN ('image/jpeg', 'image/png', 'image/webp'))
) ENGINE = InnoDB;

-- Ficha clínica del paciente (RF-CLI-06). La PK es el id del paciente: una ficha por paciente.
CREATE TABLE ficha (
    paciente_id      VARCHAR(10)  NOT NULL COMMENT 'nutrivida_usuarios (por valor).',
    nutricionista_id VARCHAR(10)  NOT NULL COMMENT 'A cargo: el único que la escribe.',
    objetivo         VARCHAR(20)  NOT NULL,
    antecedentes     VARCHAR(500) NOT NULL,
    creada_en        DATE         NOT NULL,
    PRIMARY KEY (paciente_id),
    CONSTRAINT fk_ficha_nutricionista FOREIGN KEY (nutricionista_id) REFERENCES nutricionista (id),
    INDEX ix_ficha_nutricionista (nutricionista_id),
    CONSTRAINT ck_ficha_objetivo CHECK (objetivo IN ('PERDIDA_PESO', 'METABOLICO', 'DEPORTIVA', 'VEGETARIANA', 'INFANTIL'))
) ENGINE = InnoDB;

-- Mediciones (C-T4). Mismos rangos que validarMedicion de EP2.
CREATE TABLE medicion (
    id               VARCHAR(10)  NOT NULL,
    paciente_id      VARCHAR(10)  NOT NULL,
    nutricionista_id VARCHAR(10)  NOT NULL COMMENT 'Quien la registró.',
    fecha            DATE         NOT NULL,
    peso_kg          DECIMAL(5,1) NOT NULL,
    talla_cm         DECIMAL(5,1) NOT NULL,
    cintura_cm       DECIMAL(5,1) NULL,
    cadera_cm        DECIMAL(5,1) NULL,
    grasa_pct        DECIMAL(4,1) NULL,
    notas            VARCHAR(300) NOT NULL DEFAULT '',
    PRIMARY KEY (id),
    CONSTRAINT fk_medicion_ficha FOREIGN KEY (paciente_id) REFERENCES ficha (paciente_id),
    INDEX ix_medicion_paciente (paciente_id, fecha),
    CONSTRAINT ck_medicion_peso    CHECK (peso_kg BETWEEN 2 AND 300),
    CONSTRAINT ck_medicion_talla   CHECK (talla_cm BETWEEN 45 AND 230),
    CONSTRAINT ck_medicion_cintura CHECK (cintura_cm IS NULL OR cintura_cm BETWEEN 30 AND 200),
    CONSTRAINT ck_medicion_cadera  CHECK (cadera_cm IS NULL OR cadera_cm BETWEEN 30 AND 200),
    CONSTRAINT ck_medicion_grasa   CHECK (grasa_pct IS NULL OR grasa_pct BETWEEN 2 AND 70)
) ENGINE = InnoDB;

-- Planes alimentarios. Se guardan todos; el vigente es el de vigente_desde más reciente.
-- Las 5 comidas van como columnas (siempre son las mismas); en JSON viajan en "comidas".
CREATE TABLE plan_alimentario (
    id               VARCHAR(10)  NOT NULL,
    paciente_id      VARCHAR(10)  NOT NULL,
    nutricionista_id VARCHAR(10)  NOT NULL,
    vigente_desde    DATE         NOT NULL,
    objetivo         VARCHAR(120) NOT NULL,
    kcal_diarias     INT          NOT NULL,
    desayuno         VARCHAR(300) NOT NULL,
    colacion         VARCHAR(300) NOT NULL,
    almuerzo         VARCHAR(300) NOT NULL,
    once             VARCHAR(300) NOT NULL,
    cena             VARCHAR(300) NOT NULL,
    indicaciones     VARCHAR(500) NOT NULL DEFAULT '',
    PRIMARY KEY (id),
    CONSTRAINT fk_plan_ficha FOREIGN KEY (paciente_id) REFERENCES ficha (paciente_id),
    INDEX ix_plan_paciente (paciente_id, vigente_desde),
    CONSTRAINT ck_plan_kcal CHECK (kcal_diarias BETWEEN 800 AND 5000)
) ENGINE = InnoDB;

-- Mensajes del formulario de contacto (RF-CLI-05).
CREATE TABLE contacto (
    id       VARCHAR(10)  NOT NULL,
    nombre   VARCHAR(80)  NOT NULL,
    correo   VARCHAR(120) NOT NULL,
    telefono VARCHAR(15)  NOT NULL DEFAULT '',
    motivo   VARCHAR(30)  NOT NULL,
    mensaje  VARCHAR(500) NOT NULL,
    fecha    DATE         NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ck_contacto_mensaje CHECK (CHAR_LENGTH(mensaje) BETWEEN 10 AND 500)
) ENGINE = InnoDB;

-- Correlativos de IDs con formato de EP2 (M0008, PA003, CT003). Se leen con SELECT … FOR UPDATE.
CREATE TABLE contador (
    nombre VARCHAR(10) NOT NULL,
    ultimo INT         NOT NULL,
    PRIMARY KEY (nombre),
    CONSTRAINT ck_contador_ultimo CHECK (ultimo >= 0)
) ENGINE = InnoDB;

-- =============================================================================================
-- Semillas: las mismas de EP2 (frontend/src/data/semillas/servicios.js, nutricionistas.js y
-- fichas.js). Si cambian allá, hay que cambiarlas aquí, en data.sql y en ClinicaSimulada (ms-citas).
-- =============================================================================================
INSERT INTO servicio (codigo, tipo, nombre, duracion_min, modalidad, precio, descripcion, destacado, cupo_max, activo) VALUES
    ('CN001', 'CONSULTA', 'Primera consulta nutricional', 50, 'Presencial', 35000, 'Evaluación inicial: anamnesis, antropometría completa y diseño del primer plan alimenticio.', FALSE, NULL, TRUE),
    ('CN002', 'CONSULTA', 'Control nutricional (seguimiento)', 30, 'Presencial', 25000, 'Seguimiento mensual: medición de indicadores y ajuste del plan vigente.', FALSE, NULL, TRUE),
    ('CN003', 'CONSULTA', 'Control nutricional quincenal', 30, 'Presencial', 22000, 'Seguimiento intensivo cada 15 días. Recomendado en los primeros 2 meses.', FALSE, NULL, TRUE),
    ('CN004', 'CONSULTA', 'Teleconsulta nutricional', 30, 'Online (video)', 20000, 'Consulta de seguimiento vía videollamada. Requiere contar con consulta presencial previa.', FALSE, NULL, TRUE),
    ('CN005', 'CONSULTA', 'Consulta de urgencia / reagendada', 30, 'Presencial', 28000, 'Para pacientes que requieren atención fuera de su control habitual.', FALSE, NULL, TRUE),
    ('PL001', 'PLAN', 'Plan pérdida de peso (1 mes)', NULL, 'Presencial', 65000, 'Incluye primera consulta + 1 control quincenal + plan alimenticio personalizado + seguimiento por WhatsApp.', TRUE, NULL, TRUE),
    ('PL002', 'PLAN', 'Plan pérdida de peso (3 meses)', NULL, 'Presencial', 170000, 'Incluye primera consulta + 5 controles + 3 planes mensuales + seguimiento continuo.', TRUE, NULL, TRUE),
    ('PL003', 'PLAN', 'Plan nutrición deportiva (1 mes)', NULL, 'Presencial', 70000, 'Para deportistas y personas con actividad física frecuente. Cálculo de requerimientos energéticos y proteicos.', TRUE, NULL, TRUE),
    ('PL004', 'PLAN', 'Plan control diabetes / hipertensión', NULL, 'Presencial', 75000, 'Plan adaptado para patologías metabólicas. Coordinación con médico tratante si aplica.', TRUE, NULL, TRUE),
    ('PL005', 'PLAN', 'Plan alimentación vegetariana/vegana', NULL, 'Presencial', 68000, 'Diseñado para garantizar aporte adecuado de proteínas, hierro, vitamina B12 y calcio sin productos animales.', TRUE, NULL, TRUE),
    ('PL006', 'PLAN', 'Plan alimentación infantil (2-12 años)', NULL, 'Presencial', 65000, 'Evaluación nutricional pediátrica y diseño de plan adaptado a la etapa de desarrollo del niño.', TRUE, NULL, TRUE),
    ('EV001', 'EVALUACION', 'Antropometría completa', 20, 'Presencial', 18000, 'Peso, talla, IMC, circunferencia de cintura, cadera, brazo y % de grasa corporal con bioimpedanciometría.', FALSE, NULL, TRUE),
    ('EV002', 'EVALUACION', 'Bioimpedanciometría', 15, 'Presencial', 12000, 'Medición de composición corporal: masa grasa, masa muscular, agua corporal y edad metabólica.', FALSE, NULL, TRUE),
    ('EV003', 'EVALUACION', 'Encuesta de hábitos alimentarios', 20, 'Presencial', 10000, 'Análisis del patrón alimentario actual. Identificación de déficit y excesos nutricionales.', FALSE, NULL, TRUE),
    ('EV004', 'EVALUACION', 'Análisis de exámenes de laboratorio', 20, 'Presencial', 15000, 'Interpretación de hemograma, perfil bioquímico y lipídico en contexto nutricional.', FALSE, NULL, TRUE),
    ('TG001', 'TALLER', 'Taller de alimentación saludable', 90, 'Presencial (grupo)', 15000, 'Máx. 10 personas. Conceptos básicos de alimentación equilibrada y lectura de etiquetas.', FALSE, 10, TRUE),
    ('TG002', 'TALLER', 'Taller de cocina nutritiva', 120, 'Presencial (grupo)', 20000, 'Preparación de recetas saludables. Incluye degustación. Máx. 8 personas.', FALSE, 8, TRUE),
    ('TG003', 'TALLER', 'Taller nutrición para deportistas', 90, 'Presencial (grupo)', 18000, 'Hidratación, nutrición pre y post entrenamiento, suplementación básica. Máx. 12 personas.', FALSE, 12, TRUE);

INSERT INTO nutricionista (id, usuario_id, nombre, especialidad, hora_inicio, hora_fin) VALUES
    ('NUT001', 'U010', 'Carolina Fuentes M.', 'Obesidad y síndrome metabólico', '09:00', '17:00'),
    ('NUT002', 'U011', 'Rodrigo Sepúlveda A.', 'Nutrición deportiva y rendimiento', '09:00', '14:00'),
    ('NUT003', 'U012', 'Daniela Morales C.', 'Alimentación vegetariana, vegana y trastornos alimentarios', '08:00', '13:00'),
    ('NUT004', 'U013', 'Felipe Araya R.', 'Nutrición pediátrica y familiar', '14:00', '19:00');

INSERT INTO nutricionista_dia (nutricionista_id, dia) VALUES
    ('NUT001', 1),
    ('NUT001', 3),
    ('NUT001', 5),
    ('NUT002', 2),
    ('NUT002', 4),
    ('NUT002', 6),
    ('NUT003', 1),
    ('NUT003', 2),
    ('NUT003', 3),
    ('NUT003', 4),
    ('NUT003', 5),
    ('NUT004', 2),
    ('NUT004', 3),
    ('NUT004', 4),
    ('NUT004', 5);

INSERT INTO ficha (paciente_id, nutricionista_id, objetivo, antecedentes, creada_en) VALUES
    ('U100', 'NUT001', 'PERDIDA_PESO', 'Sin patologías informadas. Trabajo de oficina, actividad física baja.', '2026-07-03'),
    ('U101', 'NUT002', 'DEPORTIVA', 'Corredor recreativo, 4 entrenamientos por semana.', '2026-09-01');

INSERT INTO medicion (id, paciente_id, nutricionista_id, fecha, peso_kg, talla_cm, cintura_cm, cadera_cm, grasa_pct, notas) VALUES
    ('M0001', 'U100', 'NUT001', '2026-07-03', 78, 170, 92, NULL, 34, ''),
    ('M0002', 'U100', 'NUT001', '2026-07-17', 76.9, 170, 90, NULL, 33.1, ''),
    ('M0003', 'U100', 'NUT001', '2026-08-07', 75.6, 170, 88, NULL, 32, ''),
    ('M0004', 'U100', 'NUT001', '2026-09-04', 73.8, 170, 86, NULL, 30.8, ''),
    ('M0005', 'U100', 'NUT001', '2026-10-02', 72.4, 170, 84, NULL, 29.9, ''),
    ('M0006', 'U101', 'NUT002', '2026-09-01', 68.5, 176, 78, NULL, 14.2, ''),
    ('M0007', 'U101', 'NUT002', '2026-09-29', 68.9, 176, 78, NULL, 13.6, '');

INSERT INTO plan_alimentario (id, paciente_id, nutricionista_id, vigente_desde, objetivo, kcal_diarias,
                              desayuno, colacion, almuerzo, once, cena, indicaciones) VALUES
    ('PA001', 'U100', 'NUT001', '2026-10-02', 'Pérdida de peso gradual', 1800, 'Avena con fruta y yogur natural.', 'Una fruta y 10 almendras.', 'Legumbres o pescado con ensalada y media taza de arroz integral.', 'Pan integral con palta o quesillo, y té.', 'Verduras salteadas con huevo o pollo.', '2 litros de agua al día. Caminar 30 minutos.'),
    ('PA002', 'U101', 'NUT002', '2026-09-29', 'Rendimiento en carrera de fondo', 2700, 'Pan integral con huevo, fruta y leche.', 'Plátano y yogur antes de entrenar.', 'Arroz o fideos integrales con pollo y ensalada.', 'Sándwich de pavo y fruta.', 'Pescado con papas cocidas y verduras.', 'Hidratación según el plan de entrenamiento acordado en consulta.');

-- Mensajes de ejemplo (datos ficticios) para ver la bandeja de contactos.
INSERT INTO contacto (id, nombre, correo, telefono, motivo, mensaje, fecha) VALUES
    ('CT001', 'Marta Rojas', 'marta.rojas@ejemplo.cl', '+56912345678', 'Planes y precios',
     '¿El plan de 3 meses se puede pagar en cuotas?', '2026-11-02'),
    ('CT002', 'Jorge Pino', 'jorge.pino@ejemplo.cl', '', 'Talleres grupales',
     'Quisiera saber la próxima fecha del taller de cocina nutritiva.', '2026-11-05');

INSERT INTO contador (nombre, ultimo) VALUES ('MEDICION', 7), ('PLAN', 2), ('CONTACTO', 2);
