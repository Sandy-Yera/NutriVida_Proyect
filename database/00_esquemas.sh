#!/bin/bash
# Se ejecuta una sola vez, al crear el volumen de MySQL (docker-entrypoint-initdb.d).
# Crea los 3 esquemas (uno por microservicio) y da permisos al usuario de la aplicación.
# Los scripts 01_usuarios.sql, 02_citas.sql y 03_clinica.sql crean las tablas y las semillas;
# cada uno empieza con "USE nutrivida_<modulo>;".
set -e
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS nutrivida_usuarios CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nutrivida_citas    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nutrivida_clinica  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON nutrivida_usuarios.* TO '$MYSQL_USER'@'%';
GRANT ALL PRIVILEGES ON nutrivida_citas.*    TO '$MYSQL_USER'@'%';
GRANT ALL PRIVILEGES ON nutrivida_clinica.*  TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL
