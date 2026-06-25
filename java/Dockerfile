# --- STAGE 1: Bauen der Applikation ---
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Kopiere die pom.xml und den Source-Code in den Container
COPY pom.xml .
COPY src ./src

# Baue die .jar Datei
RUN mvn clean package -DskipTests

# --- STAGE 2: Ausführen der Applikation ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Kopiere die fertige .jar Datei aus Stage 1
COPY --from=build /app/target/*.jar app.jar

# Starte das Java Backend
CMD ["java", "-jar", "app.jar"]