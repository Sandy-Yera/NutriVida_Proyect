@echo off
setlocal
set "BASE_DIR=%~dp0"
rem %~dp0 termina en "\": se quita, porque \" escapa la comilla y rompe rutas con espacios.
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar"
if not exist "%JAR%" (
  echo Descargando Maven Wrapper oficial en la primera ejecucion...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.4/maven-wrapper-3.3.4.jar' -OutFile '%JAR%'"
  if errorlevel 1 (
    echo ERROR: no se pudo descargar Maven Wrapper. Se requiere conexion a Internet.
    exit /b 1
  )
)
java -Dmaven.multiModuleProjectDirectory="%BASE_DIR%" -classpath "%JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
exit /b %ERRORLEVEL%
