# ms-clinica: se compila y se ejecuta dentro de Docker. No necesita Java ni Maven en el equipo.
# Etapa 1 (build): Maven 3.9 + JDK 21 compila el .jar. La caché de ~/.m2 acelera las siguientes compilaciones.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package

# Etapa 2 (runtime): solo el JRE 21 y el .jar. Imagen más liviana y sin el código fuente.
FROM eclipse-temurin:21-jre
WORKDIR /app
# Usuario sin privilegios: si alguien vulnera la app, no es root dentro del contenedor.
RUN useradd --system --uid 10001 --no-create-home nutrivida
COPY --from=build /app/target/*.jar app.jar
USER nutrivida
ENV TZ=America/Santiago \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8083
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
