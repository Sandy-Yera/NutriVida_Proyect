<#
.SYNOPSIS
  Verificación de NutriVida antes de cada commit (definición de terminado de EP3).

.DESCRIPTION
  1. backend  : pruebas JUnit de ms-citas, dentro de Docker con Java 21 (igual que la imagen).
  2. frontend : pruebas de Vitest (modo local); deben seguir pasando todas.
  3. docker   : docker compose up -d --build, recarga SOLO el esquema nutrivida_citas con
                database/02_citas.sql (no borra el volumen ni toca los otros dos esquemas),
                espera a ms-citas (Hibernate valida que las entidades calcen con las tablas)
                y hace peticiones de humo contra el contrato (contrato-backend.md §2). También
                muestra con qué cliente de ms-clinica arrancó ms-citas y revisa que los
                catálogos de ms-clinica, si ya existen, traigan los campos que ms-citas usa.

  Termina con una tabla PASA/FALLA y una línea "VEREDICTO". Código de salida 0 solo si todo pasa.
  Los logs completos quedan en %TEMP%\nutrivida-verificar-*.log.

.EXAMPLE
  .\scripts\verificar.ps1                     # todo
  .\scripts\verificar.ps1 -Solo backend       # solo JUnit de ms-citas
  .\scripts\verificar.ps1 -Solo frontend      # solo Vitest
  .\scripts\verificar.ps1 -Solo docker        # compose + esquema de citas + humo
  .\scripts\verificar.ps1 -SinRecargarCitas   # no reinicia los datos de nutrivida_citas
#>
param(
    [ValidateSet('todo', 'backend', 'frontend', 'docker')]
    [string]$Solo = 'todo',
    [switch]$SinRecargarCitas
)

$ErrorActionPreference = 'Continue'   # los comandos nativos escriben en stderr sin fallar
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $OutputEncoding

$raiz = Split-Path -Parent $PSScriptRoot
$resultados = New-Object System.Collections.Generic.List[object]

function Anotar([string]$paso, [bool]$ok, [string]$detalle) {
    $estado = if ($ok) { 'PASA' } else { 'FALLA' }
    $resultados.Add([pscustomobject]@{ Paso = $paso; Resultado = $estado; Detalle = $detalle })
    $color = if ($ok) { 'Green' } else { 'Red' }
    Write-Host ("[{0}] {1} - {2}" -f $estado, $paso, $detalle) -ForegroundColor $color
}

function Log([string]$nombre) { Join-Path $env:TEMP "nutrivida-verificar-$nombre.log" }

# Devuelve @{ Status = 401; Cuerpo = '{...}' }. Status 0 si no hubo respuesta.
function Pedir([string]$url) {
    $salida = & curl.exe -s -L --max-time 10 -w "`n%{http_code}" $url 2>$null
    if (-not $salida) { return @{ Status = 0; Cuerpo = '' } }
    $lineas = @($salida)
    $status = [int]$lineas[-1]
    $cuerpo = if ($lineas.Count -gt 1) { ($lineas[0..($lineas.Count - 2)] -join "`n") } else { '' }
    return @{ Status = $status; Cuerpo = $cuerpo }
}

function EsErrorComun([string]$cuerpo, [int]$status) {
    foreach ($campo in '"timestamp"', '"status"', '"error"', '"mensaje"', '"ruta"') {
        if ($cuerpo -notmatch [regex]::Escape($campo)) { return $false }
    }
    return $cuerpo -match ('"status"\s*:\s*' + $status)
}

# Ejecuta mysql como root dentro del contenedor. La clave la toma el contenedor de su propia
# variable (MYSQL_PWD), así no se lee el .env. Sin comillas dobles: PowerShell 5.1 las borra al
# pasar argumentos a un programa externo, y el comando llegaría roto a sh.
function MysqlRoot([string]$argumentos) {
    $cmd = "MYSQL_PWD=`$MYSQL_ROOT_PASSWORD mysql -uroot --default-character-set=utf8mb4 $argumentos"
    $salida = & docker compose exec -T mysql sh -c $cmd 2>&1
    return @{ Codigo = $LASTEXITCODE; Salida = ($salida | Out-String).Trim() }
}

# $sql no puede llevar comillas simples (va entre comillas simples para sh).
function ConsultaCitas([string]$sql) {
    return (MysqlRoot "-N -e '$sql'").Salida
}

Push-Location $raiz
try {
    # ---------------------------------------------------------------- 1. backend
    if ($Solo -in 'todo', 'backend') {
        Write-Host "`n== Backend: JUnit de ms-citas (Docker, Java 21)" -ForegroundColor Cyan
        $ms = Join-Path $raiz 'backend\ms-citas'
        $log = Log 'backend'
        & docker run --rm -v "${ms}:/app" -v nutrivida-m2:/root/.m2 -w /app `
            maven:3.9-eclipse-temurin-21 mvn -B test 2>&1 | Out-File -Encoding utf8 $log
        $codigo = $LASTEXITCODE
        $texto = Get-Content $log -Raw -Encoding UTF8
        $resumen = [regex]::Matches($texto, 'Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)(?!,)')
        if ($resumen.Count -gt 0) {
            $m = $resumen[$resumen.Count - 1]
            $detalle = "{0} pruebas, {1} fallas, {2} errores, {3} omitidas" -f $m.Groups[1], $m.Groups[2], $m.Groups[3], $m.Groups[4]
        } elseif ($texto -match 'No tests to run') {
            $detalle = 'sin pruebas todavía'
        } else {
            $detalle = 'no compiló o Maven falló'
        }
        if ($codigo -ne 0) {
            # Resumen de Surefire ("Clase.prueba » causa" o "Clase.prueba:42 esperado…") o error de compilación.
            $fallas = ([regex]::Matches($texto, '(?m)^\[ERROR\]\s{2,}\S+\.\S+(:\d+)?\s.*$|^\[ERROR\].*\.java:\[\d+.*$') |
                Select-Object -First 5 | ForEach-Object { $_.Value.Trim() }) -join ' | '
            if ($fallas) { $detalle += " :: $fallas" }
            $detalle += " (log: $log)"
        }
        Anotar 'JUnit ms-citas' ($codigo -eq 0) $detalle
    }

    # ---------------------------------------------------------------- 2. frontend
    if ($Solo -in 'todo', 'frontend') {
        Write-Host "`n== Frontend: Vitest (modo local)" -ForegroundColor Cyan
        $front = Join-Path $raiz 'frontend'
        $log = Log 'frontend'
        # Push-Location no cambia el directorio del proceso: npm lo necesita para hallar package.json.
        $antes = [Environment]::CurrentDirectory
        Push-Location $front
        [Environment]::CurrentDirectory = $front
        if (-not (Test-Path 'node_modules')) { & npm.cmd ci --no-audit --no-fund 2>&1 | Out-File -Encoding utf8 (Log 'npm-ci') }
        & npm.cmd test 2>&1 | Out-File -Encoding utf8 $log
        $codigo = $LASTEXITCODE
        [Environment]::CurrentDirectory = $antes
        Pop-Location
        $texto = (Get-Content $log -Raw -Encoding UTF8) -replace '\x1b\[[0-9;]*m', ''
        $linea = ([regex]::Match($texto, '(?m)^\s*Tests\s+(.+)$')).Groups[1].Value.Trim()
        if (-not $linea) { $linea = 'Vitest no terminó' }
        if ($codigo -ne 0) { $linea += " (log: $log)" }
        Anotar 'Vitest frontend' ($codigo -eq 0) $linea
    }

    # ---------------------------------------------------------------- 3. docker
    if ($Solo -in 'todo', 'docker') {
        Write-Host "`n== Docker: 5 servicios, esquema de citas y humo" -ForegroundColor Cyan
        if (-not (Test-Path '.env')) {
            Anotar 'Archivo .env' $false 'falta .env (copiar .env.example y definir JWT_SECRET)'
            throw 'sin .env'
        }
        $log = Log 'docker'
        & docker compose up -d --build 2>&1 | Out-File -Encoding utf8 $log
        Anotar 'docker compose up --build' ($LASTEXITCODE -eq 0) "log: $log"

        # MySQL sano antes de tocar el esquema.
        for ($i = 0; $i -lt 60; $i++) {
            $salud = (& docker inspect -f '{{.State.Health.Status}}' (& docker compose ps -q mysql) 2>$null | Out-String).Trim()
            if ($salud -eq 'healthy') { break }
            Start-Sleep -Seconds 2
        }
        Anotar 'MySQL healthy' ($salud -eq 'healthy') "estado: $salud"

        $script = Join-Path $raiz 'database\02_citas.sql'
        $hayScript = Test-Path $script
        # ms-citas se detiene mientras se recrea su esquema y vuelve a arrancar después: así
        # Hibernate valida las entidades contra las tablas recién creadas, y no queda ningún
        # mensaje "Started" de la ejecución anterior que confunda la espera.
        & docker compose stop ms-citas 2>&1 | Out-Null
        if ($hayScript -and -not $SinRecargarCitas) {
            # Solo el esquema de ms-citas: los permisos sobre nutrivida_citas.* sobreviven al DROP.
            $r1 = MysqlRoot "-e 'DROP DATABASE IF EXISTS nutrivida_citas; CREATE DATABASE nutrivida_citas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"
            & docker compose cp $script mysql:/tmp/02_citas.sql 2>&1 | Out-Null
            $r2 = MysqlRoot '< /tmp/02_citas.sql'
            $ok = ($r1.Codigo -eq 0) -and ($r2.Codigo -eq 0)
            Anotar 'Carga de 02_citas.sql' $ok $(if ($ok) { 'esquema nutrivida_citas recreado' } else { ($r1.Salida + ' ' + $r2.Salida).Trim() })
        }

        & docker compose start ms-citas 2>&1 | Out-Null
        $arranco = $false; $fallo = $false
        for ($i = 0; $i -lt 60 -and -not $arranco -and -not $fallo; $i++) {
            Start-Sleep -Seconds 2
            $arranco = (Pedir 'http://localhost:8082/v3/api-docs').Status -eq 200
            $logMs = & docker compose logs --tail 300 ms-citas 2>&1 | Out-String
            $fallo = $logMs -match 'APPLICATION FAILED TO START|Schema-validation'
        }
        if ($arranco) {
            Anotar 'ms-citas arranca (validate)' $true 'entidades y tablas calzan'
        } else {
            $motivo = ([regex]::Matches($logMs, '(?m)^.*(Schema-validation|Caused by|Description:|Reason:).*$') |
                Select-Object -First 3 | ForEach-Object { ($_.Value -replace '^ms-citas-1\s*\|\s*', '').Trim() }) -join ' | '
            Anotar 'ms-citas arranca (validate)' $false $(if ($motivo) { $motivo } else { 'no arrancó en 120 s' })
        }

        Start-Sleep -Seconds 3
        $esperados = 'mysql', 'ms-usuarios', 'ms-citas', 'ms-clinica', 'frontend'
        $corriendo = @(& docker compose ps --status running --services 2>$null)
        $faltan = $esperados | Where-Object { $corriendo -notcontains $_ }
        Anotar '5 servicios corriendo' ($faltan.Count -eq 0) $(if ($faltan) { 'caídos: ' + ($faltan -join ', ') } else { $esperados -join ', ' })

        foreach ($puerto in 8081, 8082, 8083) {
            $r = Pedir "http://localhost:$puerto/swagger-ui.html"
            Anotar "Swagger :$puerto" ($r.Status -eq 200) "HTTP $($r.Status)"
        }
        $r = Pedir 'http://localhost:8080/'
        Anotar 'App :8080' ($r.Status -eq 200) "HTTP $($r.Status)"

        $r = Pedir 'http://localhost:8082/api/citas'
        Anotar 'GET /api/citas sin token' (($r.Status -eq 401) -and (EsErrorComun $r.Cuerpo 401)) "HTTP $($r.Status), JSON común: $(EsErrorComun $r.Cuerpo 401)"
        $r = Pedir 'http://localhost:8080/api/citas/mias'
        Anotar 'Proxy /api/citas/mias sin token' (($r.Status -eq 401) -and (EsErrorComun $r.Cuerpo 401)) "HTTP $($r.Status)"
        $r = Pedir 'http://localhost:8080/api/noexiste'
        Anotar 'Proxy ruta inexistente' (($r.Status -eq 404) -and (EsErrorComun $r.Cuerpo 404)) "HTTP $($r.Status)"

        # R6: con qué cliente de ms-clinica arrancó ms-citas (ClinicaConfig deja la línea en el log).
        $modo = ([regex]::Match($logMs, 'ms-clinica: modo (.+)$', 'Multiline')).Groups[1].Value.Trim()
        Anotar 'ms-citas -> ms-clinica (modo)' ([bool]$modo) $(if ($modo) { $modo } else { 'falta la línea "ms-clinica: modo" en el log' })

        # Lo que ms-citas lee de ms-clinica. 404 = C-31 aún no está y el modo auto usa las semillas.
        # 200 = se revisan los campos que ClinicaHttp exige; cualquier otra cosa haría responder 503.
        $catalogos = @(
            @{ Ruta = '/api/nutricionistas'; Campos = '"id"', '"dias"', '"horaInicio"', '"horaFin"' },
            @{ Ruta = '/api/servicios'; Campos = '"codigo"', '"modalidad"', '"precio"', '"duracionMin"' })
        foreach ($c in $catalogos) {
            $r = Pedir "http://localhost:8083$($c.Ruta)"
            if ($r.Status -eq 404) {
                Anotar "Contrato ms-clinica $($c.Ruta)" $true 'aún no existe (C-31): ms-citas usa las semillas de EP2'
            } elseif ($r.Status -eq 200) {
                $faltan = @($c.Campos | Where-Object { $r.Cuerpo -notmatch [regex]::Escape($_) })
                $esLista = $r.Cuerpo.TrimStart().StartsWith('[')
                $ok = $esLista -and $faltan.Count -eq 0
                $detalle = if ($ok) { 'lista con los campos que usa ms-citas' } elseif (-not $esLista) { 'no es una lista JSON' } else { 'faltan: ' + ($faltan -join ', ') }
                Anotar "Contrato ms-clinica $($c.Ruta)" $ok $detalle
            } else {
                Anotar "Contrato ms-clinica $($c.Ruta)" $false "HTTP $($r.Status): ms-citas respondería 503"
            }
        }

        if ($hayScript) {
            $citas = ConsultaCitas 'SELECT COUNT(*) FROM nutrivida_citas.cita'
            $pagos = ConsultaCitas 'SELECT COUNT(*) FROM nutrivida_citas.pago'
            Anotar 'Semillas de citas' (($citas -match '^\d+$') -and [int]$citas -gt 0) "citas: $citas, pagos: $pagos"
        }
    }
}
catch {
    Anotar 'Script' $false $_.Exception.Message
}
finally {
    Pop-Location
}

Write-Host ''
$resultados | Format-Table -AutoSize -Wrap | Out-String -Width 220 | Write-Host
$fallas = @($resultados | Where-Object { $_.Resultado -eq 'FALLA' }).Count
if ($fallas -eq 0) {
    Write-Host 'VEREDICTO: PASA' -ForegroundColor Green
    exit 0
}
Write-Host "VEREDICTO: FALLA ($fallas)" -ForegroundColor Red
exit 1
