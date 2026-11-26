-- =============================================================================================
-- ms-usuarios (Gabriel) · esquema nutrivida_usuarios
--
-- MySQL lo ejecuta una sola vez, al crear el volumen (docker-entrypoint-initdb.d), después de
-- 00_esquemas.sh. Para recargarlo: docker compose down -v y docker compose up -d --build.
-- ms-usuarios arranca con ddl-auto=validate: las entidades JPA deben calzar con estas tablas.
--
-- Reglas del contrato (documentacion/ep3/contrato-backend.md):
-- - Mismos IDs que en EP2: U001…U102 (§1). nutricionista_id apunta a nutrivida_clinica por
--   valor, sin clave foránea entre esquemas.
-- - La base es la última barrera: UNIQUE en correo, RUT y nutricionista_id (§5).
-- - La contraseña se guarda solo como hash BCrypt (60 caracteres), nunca en texto plano.
-- =============================================================================================
-- El cliente mysql del contenedor lee el archivo en latin1: sin esto las tildes quedan dañadas.
SET NAMES utf8mb4;
USE nutrivida_usuarios;

-- Cuenta de cada persona (RF-ACC-01 a RF-ACC-07). Un solo rol por cuenta.
CREATE TABLE usuario (
    id               VARCHAR(10)  NOT NULL,
    nombre           VARCHAR(50)  NOT NULL,
    apellido         VARCHAR(50)  NOT NULL,
    rut              VARCHAR(12)  NOT NULL COMMENT 'Con puntos y guion: 12.345.678-5.',
    correo           VARCHAR(120) NOT NULL COMMENT 'En minúsculas.',
    telefono         VARCHAR(20)  NOT NULL COMMENT '+56 9 1234 5678.',
    fecha_nacimiento DATE         NULL,
    clave            VARCHAR(60)  NOT NULL COMMENT 'Hash BCrypt.',
    rol              VARCHAR(15)  NOT NULL,
    nutricionista_id VARCHAR(10)  NULL     COMMENT 'Solo NUTRICIONISTA (nutrivida_clinica, por valor).',
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en        DATE         NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_usuario_correo        UNIQUE (correo),
    CONSTRAINT uq_usuario_rut           UNIQUE (rut),
    CONSTRAINT uq_usuario_nutricionista UNIQUE (nutricionista_id),
    INDEX ix_usuario_rol (rol, activo),
    CONSTRAINT ck_usuario_rol CHECK (rol IN ('ADMIN', 'SECRETARIA', 'NUTRICIONISTA', 'PACIENTE')),
    -- RN-30: solo un nutricionista lleva nutricionista_id.
    CONSTRAINT ck_usuario_nutricionista CHECK (
        (rol = 'NUTRICIONISTA' AND nutricionista_id IS NOT NULL)
        OR (rol <> 'NUTRICIONISTA' AND nutricionista_id IS NULL))
) ENGINE = InnoDB;

-- Consejos nutricionales (RF-ACC-09). Solo lectura, como en EP2.
CREATE TABLE articulo (
    id                      VARCHAR(60)  NOT NULL COMMENT 'Slug de la URL /consejos/:id.',
    titulo                  VARCHAR(120) NOT NULL,
    resumen                 VARCHAR(250) NOT NULL,
    contenido               VARCHAR(2000) NOT NULL,
    autor_nutricionista_id  VARCHAR(10)  NOT NULL COMMENT 'nutrivida_clinica (por valor).',
    fecha                   DATE         NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB;

-- Correlativo de IDs (U103, U104…). Se lee con SELECT … FOR UPDATE: dos registros simultáneos
-- nunca reciben el mismo número.
CREATE TABLE contador (
    nombre VARCHAR(10) NOT NULL,
    ultimo INT         NOT NULL,
    PRIMARY KEY (nombre),
    CONSTRAINT ck_contador_ultimo CHECK (ultimo >= 0)
) ENGINE = InnoDB;

-- Cuentas demo de EP2 (credenciales ficticias, ver documentacion/integracion-ep3.md §8):
--   ADMIN          admin@nutrivida.cl       Admin2026!
--   SECRETARIA     recepcion@nutrivida.cl   Recepcion2026!
--   NUTRICIONISTA  cfuentes@nutrivida.cl    Nutri2026!     (también U011 a U013)
--   PACIENTE       javiera.soto@correo.cl   Paciente2026!  (también U101 y U102)
--   PACIENTE       pedro.lagos@correo.cl    Paciente2026!  (U103, desactivada: login 403)
INSERT INTO usuario (id, nombre, apellido, rut, correo, telefono, fecha_nacimiento, clave, rol,
                     nutricionista_id, activo, creado_en) VALUES
    ('U001', 'Administración', 'NutriVida', '9.876.543-3', 'admin@nutrivida.cl', '+56 9 1111 0001', '1985-03-12',
     '$2a$10$5ass6whZiFGs.v1UgzipD.k4SFTfV.0FHB3S7YBS6y5ZcT8gjrZWe', 'ADMIN', NULL, TRUE, '2026-08-01'),
    ('U002', 'Marta', 'Ríos', '15.999.888-6', 'recepcion@nutrivida.cl', '+56 9 1111 0002', '1990-07-21',
     '$2a$10$Zb2gNW1VqY690sDVJRqmJOiI3spz5NxNhxxbRFl0vEZiMOZeJpt5q', 'SECRETARIA', NULL, TRUE, '2026-08-01'),
    ('U010', 'Carolina', 'Fuentes M.', '16.222.333-K', 'cfuentes@nutrivida.cl', '+56 9 1111 0010', '1987-01-30',
     '$2a$10$dn/mYq3Y0Y9eTYfKknpv9eHxc88faoaIpgMNLs5l30GmAj7PgX6CW', 'NUTRICIONISTA', 'NUT001', TRUE, '2026-08-01'),
    ('U011', 'Rodrigo', 'Sepúlveda A.', '13.777.666-9', 'rsepulveda@nutrivida.cl', '+56 9 1111 0011', '1982-11-05',
     '$2a$10$dn/mYq3Y0Y9eTYfKknpv9eHxc88faoaIpgMNLs5l30GmAj7PgX6CW', 'NUTRICIONISTA', 'NUT002', TRUE, '2026-08-01'),
    ('U012', 'Daniela', 'Morales C.', '17.654.321-3', 'dmorales@nutrivida.cl', '+56 9 1111 0012', '1991-06-18',
     '$2a$10$dn/mYq3Y0Y9eTYfKknpv9eHxc88faoaIpgMNLs5l30GmAj7PgX6CW', 'NUTRICIONISTA', 'NUT003', TRUE, '2026-08-01'),
    ('U013', 'Felipe', 'Araya R.', '18.444.555-7', 'faraya@nutrivida.cl', '+56 9 1111 0013', '1993-09-09',
     '$2a$10$dn/mYq3Y0Y9eTYfKknpv9eHxc88faoaIpgMNLs5l30GmAj7PgX6CW', 'NUTRICIONISTA', 'NUT004', TRUE, '2026-08-01'),
    ('U100', 'Javiera', 'Soto', '19.876.543-0', 'javiera.soto@correo.cl', '+56 9 2222 0100', '1997-04-14',
     '$2a$10$w0ZhDj.QRJveWT6qpdf9vuC/pepysEDXXwZ/YG9Yu/XCw8hsELBCW', 'PACIENTE', NULL, TRUE, '2026-08-01'),
    ('U101', 'Tomás', 'Huenchullán', '20.456.789-1', 'tomas.h@correo.cl', '+56 9 2222 0101', '2000-12-02',
     '$2a$10$w0ZhDj.QRJveWT6qpdf9vuC/pepysEDXXwZ/YG9Yu/XCw8hsELBCW', 'PACIENTE', NULL, TRUE, '2026-08-01'),
    ('U102', 'Ana', 'Pérez', '21.333.444-1', 'ana.perez@correo.cl', '+56 9 2222 0102', '2002-08-27',
     '$2a$10$w0ZhDj.QRJveWT6qpdf9vuC/pepysEDXXwZ/YG9Yu/XCw8hsELBCW', 'PACIENTE', NULL, TRUE, '2026-08-01'),
    ('U103', 'Pedro', 'Lagos', '22.111.222-9', 'pedro.lagos@correo.cl', '+56 9 2222 0103', '1999-05-20',
     '$2a$10$w0ZhDj.QRJveWT6qpdf9vuC/pepysEDXXwZ/YG9Yu/XCw8hsELBCW', 'PACIENTE', NULL, FALSE, '2026-08-01');

INSERT INTO articulo (id, titulo, resumen, contenido, autor_nutricionista_id, fecha) VALUES
    ('colaciones-jornada-laboral', 'Colaciones para la jornada laboral',
     'Ideas simples para llegar con menos hambre al almuerzo y a la once.',
     'Una colación ayuda a repartir la energía del día. Prefiere opciones que combinen fruta o verdura con una fuente de proteína, como yogur natural, un huevo duro o un puñado de frutos secos. Prepáralas la noche anterior y llévalas en un envase cerrado. Si tienes un plan alimenticio, sigue las porciones que acordaste con tu nutricionista.',
     'NUT003', '2026-09-15'),
    ('hidratacion-antes-de-entrenar', 'Hidratación antes de entrenar',
     'Llegar bien hidratado al entrenamiento empieza horas antes.',
     'Bebe agua de forma regular durante el día, no solo cuando tengas sed. Antes de entrenar, toma un vaso de agua con algo de anticipación. En sesiones largas o con mucho calor, conversa con tu nutricionista si necesitas bebidas con electrolitos. Cada persona tiene requerimientos distintos: tu plan debe ajustarse a tu entrenamiento.',
     'NUT002', '2026-10-01');

INSERT INTO contador (nombre, ultimo) VALUES ('USUARIO', 103);
