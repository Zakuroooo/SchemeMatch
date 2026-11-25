# Build context = repository root, because the bundled schemes live in apps/api:
#   docker build -f apps/api-spring/Dockerfile .

# Stage 1: build the jar. (Tests run in CI: they need Docker themselves.)
FROM azul/zulu-openjdk-alpine:17 AS build
WORKDIR /repo/apps/api-spring
COPY apps/api-spring/mvnw apps/api-spring/pom.xml ./
COPY apps/api-spring/.mvn .mvn
COPY apps/api/src/generated/schemes.json ../api/src/generated/schemes.json
COPY apps/api-spring/src/main src/main
RUN ./mvnw -q -B package -DskipTests && cp target/api-spring-*.jar /app.jar

# Stage 2: only a Java runtime and the jar, run by a user without root rights.
FROM azul/zulu-openjdk-alpine:17-jre
RUN adduser -D app
USER app
COPY --from=build /app.jar /app.jar
EXPOSE 3002
ENTRYPOINT ["java", "-jar", "/app.jar"]
