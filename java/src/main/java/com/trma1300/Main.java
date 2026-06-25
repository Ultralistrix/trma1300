package com.trma1300;

import io.javalin.Javalin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        // 1. Starte den Java API-Server auf Port 8080
        Javalin app = Javalin.create(config -> {
            // Erlaube dem Frontend (Nginx), mit dem Backend zu kommunizieren (CORS)
            config.plugins.enableCors(cors -> {
                cors.add(it -> it.anyHost());
            });
        }).start(8080);

        // 2. Erstelle den API-Endpunkt für das Frontend
        app.get("/api/data", ctx -> {
            String fakeDbContent = "Platzhalter-Daten konnten nicht geladen werden.";

            // 3. Lese die fakedb.md aus dem resources-Ordner
            // Der "/" am Anfang ist wichtig, damit er im Hauptverzeichnis der resources sucht
            try (InputStream is = Main.class.getResourceAsStream("/fakedb.md")) {
                if (is != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                        // Liest alle Zeilen der Markdown-Datei und fügt sie zu einem String zusammen
                        fakeDbContent = reader.lines().collect(Collectors.joining("\n"));
                    }
                } else {
                    System.out.println("WARNUNG: fakedb.md wurde nicht gefunden!");
                }
            } catch (Exception e) {
                System.out.println("Fehler beim Lesen der Datei: " + e.getMessage());
            }

            // 4. Packe den Inhalt in eine Liste, damit es als JSON verschickt werden kann.
            // Wir nutzen das gleiche Format wie vorher, damit dein Frontend-Script weiterhin funktioniert!
            List<Map<String, String>> records = new ArrayList<>();
            Map<String, String> row = new HashMap<>();
            
            row.put("id", "1");
            row.put("content", fakeDbContent); // Hier landet der Text aus deiner .md Datei
            records.add(row);

            // Sende die Daten als JSON an das Frontend zurück
            ctx.json(records);
        });
    }
}