-- =============================================================================================
-- ms-citas (Simon) · esquema nutrivida_citas
--
-- MySQL lo ejecuta una sola vez, al crear el volumen (docker-entrypoint-initdb.d), después de
-- 00_esquemas.sh. Para recargar solo este esquema sin borrar el volumen: scripts\verificar.ps1.
-- ms-citas arranca con ddl-auto=validate: las entidades JPA deben calzar con estas tablas.
--
-- Reglas del contrato (documentacion/ep3/contrato-backend.md):
-- - Sin claves foráneas entre esquemas: paciente_id, nutricionista_id y servicio_codigo son
--   referencias por valor a nutrivida_usuarios y nutrivida_clinica (§1).
-- - Mismos IDs que en EP2: C0001…, P0001… (§1).
-- - La base es la última barrera: UNIQUE(cita.pago_id) y el candado de agenda_dia (§5).
-- =============================================================================================
USE nutrivida_citas;

-- Pago simulado (RN-18, RN-19). Va antes que cita porque cita.pago_id apunta aquí.
-- No guarda cita_id: el enlace vive en cita.pago_id (un solo lugar, 3FN). Si una cita cancelada
-- se elimina, el pago queda como registro contable sin cita (contrato §6.1).
CREATE TABLE pago (
    id          VARCHAR(10)  NOT NULL,
    paciente_id VARCHAR(10)  NOT NULL COMMENT 'Quien pagó (nutrivida_usuarios). Dueño del comprobante.',
    monto       INT          NOT NULL COMMENT 'Pesos chilenos, sin decimales.',
    ultimos4    VARCHAR(4)   NOT NULL COMMENT 'Solo los 4 últimos dígitos: nunca la tarjeta completa.',
    estado      VARCHAR(12)  NOT NULL,
    motivo      VARCHAR(200) NULL     COMMENT 'Por qué se rechazó (RN-19).',
    fecha       DATE         NOT NULL,
    PRIMARY KEY (id),
    INDEX ix_pago_paciente (paciente_id),
    CONSTRAINT ck_pago_estado   CHECK (estado IN ('APROBADO', 'RECHAZADO', 'REEMBOLSADO')),
    CONSTRAINT ck_pago_monto    CHECK (monto > 0),
    CONSTRAINT ck_pago_ultimos4 CHECK (ultimos4 REGEXP '^[0-9]{4}$')
) ENGINE = InnoDB;

-- Cita (RN-01 a RN-17). duracion_min es NULL en los planes: ocupan 1 bloque (RN-11).
CREATE TABLE cita (
    id               VARCHAR(10)  NOT NULL,
    paciente_id      VARCHAR(10)  NOT NULL COMMENT 'nutrivida_usuarios (por valor).',
    nutricionista_id VARCHAR(10)  NOT NULL COMMENT 'nutrivida_clinica (por valor).',
    servicio_codigo  VARCHAR(10)  NOT NULL COMMENT 'nutrivida_clinica (por valor).',
    fecha            DATE         NOT NULL,
    hora             TIME         NOT NULL,
    duracion_min     INT          NULL,
    motivo           VARCHAR(300) NOT NULL,
    estado           VARCHAR(12)  NOT NULL,
    pago_id          VARCHAR(10)  NOT NULL,
    creada_en        DATE         NOT NULL,
    PRIMARY KEY (id),
    -- RN-35: un pago respalda una sola cita. Si dos peticiones usan el mismo pago, la segunda
    -- choca aquí aunque el código fallara (GlobalExceptionHandler lo traduce a 409).
    CONSTRAINT uq_cita_pago UNIQUE (pago_id),
    CONSTRAINT fk_cita_pago FOREIGN KEY (pago_id) REFERENCES pago (id),
    INDEX ix_cita_agenda (nutricionista_id, fecha),
    INDEX ix_cita_paciente (paciente_id, fecha),
    CONSTRAINT ck_cita_estado   CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'INASISTENCIA')),
    CONSTRAINT ck_cita_duracion CHECK (duracion_min IS NULL OR duracion_min > 0),
    CONSTRAINT ck_cita_motivo   CHECK (CHAR_LENGTH(TRIM(motivo)) BETWEEN 10 AND 300)
) ENGINE = InnoDB;

-- RN-04: cada cambio de estado queda registrado, con quién lo hizo. Reprogramar también deja
-- una entrada (de X a PENDIENTE). En JSON: { fecha, de, a, por }, como en EP2.
CREATE TABLE historial_cita (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    cita_id         VARCHAR(10) NOT NULL,
    fecha           DATETIME(6) NOT NULL COMMENT 'Instante en UTC.',
    estado_anterior VARCHAR(12) NOT NULL,
    estado_nuevo    VARCHAR(12) NOT NULL,
    usuario_id      VARCHAR(10) NULL     COMMENT 'sub del JWT de quien hizo el cambio.',
    PRIMARY KEY (id),
    CONSTRAINT fk_historial_cita FOREIGN KEY (cita_id) REFERENCES cita (id) ON DELETE CASCADE,
    INDEX ix_historial_cita (cita_id, fecha),
    CONSTRAINT ck_historial_anterior CHECK (estado_anterior IN ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'INASISTENCIA')),
    CONSTRAINT ck_historial_nuevo    CHECK (estado_nuevo IN ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'INASISTENCIA'))
) ENGINE = InnoDB;

-- RN-07 (S-34, "si sobra tiempo"): un recordatorio enviado por cita. Al reprogramar se borra,
-- para que la nueva fecha tenga el suyo.
CREATE TABLE recordatorio (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    cita_id    VARCHAR(10) NOT NULL,
    enviado_en DATETIME(6) NOT NULL COMMENT 'Instante en UTC.',
    PRIMARY KEY (id),
    CONSTRAINT uq_recordatorio_cita UNIQUE (cita_id),
    CONSTRAINT fk_recordatorio_cita FOREIGN KEY (cita_id) REFERENCES cita (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Candado de agenda (contrato §5, RN-10). Crear o reprogramar una cita ejecuta primero
--   INSERT INTO agenda_dia ... ON DUPLICATE KEY UPDATE fecha = fecha
-- que deja esta fila bloqueada hasta el COMMIT. Dos reservas para el mismo nutricionista y día
-- se atienden de a una, y la segunda ya ve la cita de la primera al revisar los choques.
-- Reservas de días o nutricionistas distintos no se esperan entre sí.
CREATE TABLE agenda_dia (
    nutricionista_id VARCHAR(10) NOT NULL,
    fecha            DATE        NOT NULL,
    PRIMARY KEY (nutricionista_id, fecha)
) ENGINE = InnoDB;

-- Correlativos de IDs con formato de EP2 (C0006, P0006…). Se leen con SELECT … FOR UPDATE:
-- dos transacciones nunca obtienen el mismo número.
CREATE TABLE contador (
    nombre VARCHAR(10) NOT NULL,
    ultimo INT         NOT NULL,
    PRIMARY KEY (nombre),
    CONSTRAINT ck_contador_ultimo CHECK (ultimo >= 0)
) ENGINE = InnoDB;

-- =============================================================================================
-- Semillas: las mismas 5 citas y 5 pagos de EP2 (frontend/src/data/semillas/citas.js y pagos.js).
-- Las fechas son relativas al día en que se carga la base, como en EP2: dia_habil(dias, n) suma
-- n días a hoy y avanza hasta un día en que el nutricionista atiende.
-- dias usa la convención de EP2 y de ms-clinica: 0 = domingo … 6 = sábado.
-- =============================================================================================
DELIMITER //
CREATE FUNCTION dia_habil(dias VARCHAR(20), n INT) RETURNS DATE
    NOT DETERMINISTIC NO SQL
BEGIN
    DECLARE d DATE DEFAULT DATE_ADD(CURDATE(), INTERVAL n DAY);
    WHILE FIND_IN_SET(DAYOFWEEK(d) - 1, dias) = 0 DO   -- DAYOFWEEK: 1 = domingo … 7 = sábado
        SET d = DATE_ADD(d, INTERVAL 1 DAY);
    END WHILE;
    RETURN d;
END //
DELIMITER ;

INSERT INTO pago (id, paciente_id, monto, ultimos4, estado, motivo, fecha) VALUES
    ('P0001', 'U100', 25000, '4242', 'APROBADO', NULL, '2026-08-01'),
    ('P0002', 'U101', 35000, '4242', 'APROBADO', NULL, '2026-08-01'),
    ('P0003', 'U100', 25000, '4242', 'APROBADO', NULL, '2026-08-01'),
    ('P0004', 'U102', 35000, '4242', 'APROBADO', NULL, '2026-08-01'),
    ('P0005', 'U101', 25000, '4242', 'APROBADO', NULL, '2026-08-01');

-- NUT001 atiende L-M-V (1,3,5), NUT002 M-J-S (2,4,6), NUT003 L a V (1..5).
INSERT INTO cita (id, paciente_id, nutricionista_id, servicio_codigo, fecha, hora, duracion_min,
                  motivo, estado, pago_id, creada_en) VALUES
    ('C0001', 'U100', 'NUT001', 'CN002', dia_habil('1,3,5', -35),     '10:00', 30,
     'Control mensual de peso', 'ATENDIDA', 'P0001', '2026-08-01'),
    ('C0002', 'U101', 'NUT002', 'CN001', dia_habil('2,4,6', -9),      '09:00', 50,
     'Plan de alimentación para preparar un maratón', 'INASISTENCIA', 'P0002', '2026-08-01'),
    ('C0003', 'U100', 'NUT001', 'CN002', dia_habil('1,3,5', 1),       '11:00', 30,
     'Control mensual de peso', 'CONFIRMADA', 'P0003', '2026-08-01'),
    ('C0004', 'U102', 'NUT003', 'CN001', dia_habil('1,2,3,4,5', 2),   '08:30', 50,
     'Quiero empezar una alimentación vegana', 'PENDIENTE', 'P0004', '2026-08-01'),
    ('C0005', 'U101', 'NUT002', 'CN002', dia_habil('2,4,6', 3),       '10:00', 30,
     'Control deportivo', 'PENDIENTE', 'P0005', '2026-08-01');

INSERT INTO contador (nombre, ultimo) VALUES ('CITA', 5), ('PAGO', 5);

DROP FUNCTION dia_habil;
