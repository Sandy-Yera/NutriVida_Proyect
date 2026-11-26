# S-40: levanta NutriVida con un solo comando (Windows, PowerShell 5.1 o 7).
# Crea .env desde .env.example si no existe (con un JWT_SECRET aleatorio), compila y levanta
# los 5 contenedores y espera a que MySQL y los 3 microservicios queden "healthy".
#   .\scripts\levantar.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'Falta Docker. Instala Docker Desktop y vuelve a intentar.' -ForegroundColor Red
    exit 1
}

# .env en UTF-8 sin BOM: docker compose no acepta el BOM al inicio del archivo.
$utf8 = New-Object System.Text.UTF8Encoding $false
$envPath = Join-Path (Get-Location) '.env'
if (-not (Test-Path $envPath)) {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secreto = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    $plantilla = [System.IO.File]::ReadAllText((Join-Path (Get-Location) '.env.example'), $utf8)
    $contenido = [regex]::Replace($plantilla, '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$secreto")
    [System.IO.File]::WriteAllText($envPath, $contenido, $utf8)
    Write-Host '.env creado desde .env.example con un JWT_SECRET aleatorio.' -ForegroundColor Green
}

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host 'docker compose up falló. Revisa el mensaje de arriba.' -ForegroundColor Red
    exit 1
}

Write-Host 'Esperando a MySQL y a los 3 microservicios (la primera vez tarda varios minutos)...'
$sanos = 0
for ($i = 0; $i -lt 72; $i++) {
    $estados = @(docker compose ps --format '{{.Service}} {{.Health}}')
    $sanos = @($estados | Where-Object { $_ -match ' healthy$' }).Count
    if ($sanos -ge 4) { break }
    Start-Sleep -Seconds 5
}
docker compose ps

if ($sanos -lt 4) {
    Write-Host 'Algún servicio no quedó healthy. Revisa: docker compose logs <servicio>' -ForegroundColor Red
    exit 1
}

$web = '8080'
$linea = Select-String -Path $envPath -Pattern '^WEB_PORT=(\d+)' | Select-Object -First 1
if ($linea) { $web = $linea.Matches[0].Groups[1].Value }

Write-Host ''
Write-Host 'NutriVida está arriba:' -ForegroundColor Green
Write-Host "  App (React + Nginx)   http://localhost:$web"
Write-Host '  Swagger ms-usuarios   http://localhost:8081/swagger-ui.html'
Write-Host '  Swagger ms-citas      http://localhost:8082/swagger-ui.html'
Write-Host '  Swagger ms-clinica    http://localhost:8083/swagger-ui.html'
Write-Host 'Cuentas demo: admin@nutrivida.cl / Admin2026!  ·  javiera.soto@correo.cl / Paciente2026!'
