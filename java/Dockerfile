# 1. Pull a pre-built Java environment
FROM eclipse-temurin:17-jre-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy your specific jar file into the container
COPY java.jar /app/java.jar

# 4. Tell Docker how to run your app
CMD ["java", "-jar", "java.jar"]