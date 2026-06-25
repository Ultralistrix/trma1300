package com.trma1300;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

public class Main {
    
    // ZENTRALER PFAD ZUR DATENBANK
    public static final String DB_URL = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";

    public static void main(String[] args) throws Exception {
        // Startet den Webserver auf Port 8080
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        // =========================================================
        // 1. READ-ENDPUNKTE (Daten ans Frontend senden)
        // =========================================================

        server.createContext("/api/tasks", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
                    List<Map<String, String>> records = ReadDatabase.getAllTasks();
                    sendJsonResponse(exchange, toJson(records));
                } catch (Exception ex) { ex.printStackTrace(); }
            }
        });

        server.createContext("/api/inventory", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
                    List<Map<String, String>> records = ReadDatabase.getAllInvItems();
                    sendJsonResponse(exchange, toJson(records));
                } catch (Exception ex) { ex.printStackTrace(); }
            }
        });

        server.createContext("/api/connections", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
                    List<Map<String, String>> records = ReadDatabase.getAllConnections();
                    sendJsonResponse(exchange, toJson(records));
                } catch (Exception ex) { ex.printStackTrace(); }
            }
        });

        // =========================================================
        // 2. WRITE-ENDPUNKTE (Daten in die Datenbank schreiben)
        // =========================================================

        server.createContext("/api/add-task", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
                    
                    // TEST-DATEN: Später werden diese Werte aus dem Frontend (HTTP Request Body) gelesen!
                    WriteDatabase.insertTask(null, "Test Task", "Beschreibung hier", "Max Mustermann", 1, "2024-01-01", "2024-01-05", null);
                    
                    sendJsonResponse(exchange, "[{\"status\":\"success\", \"message\":\"Task hinzugefügt!\"}]");
                } catch (Exception ex) { ex.printStackTrace(); }
            }
        });

        server.createContext("/api/add-inventory", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
                    
                    // TEST-DATEN
                    WriteDatabase.insertInventory(null, "Laptop", "ThinkPad T14", true, "Hardware", 2, 5, 10);
                    
                    sendJsonResponse(exchange, "[{\"status\":\"success\", \"message\":\"Inventar hinzugefügt!\"}]");
                } catch (Exception ex) { ex.printStackTrace(); }
            }
        });

        server.createContext("/api/allocate", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
                    
                    // TEST-DATEN (Verbindet Task ID 1 mit Inventory ID 1)
                    WriteDatabase.connect(1, 1);
                    
                    sendJsonResponse(exchange, "[{\"status\":\"success\", \"message\":\"Verknüpfung gespeichert!\"}]");
                } catch (Exception ex) { ex.printStackTrace(); }
            }
        });

        // Server starten
        server.setExecutor(null);
        server.start();
        System.out.println("Server started on http://localhost:8080");
    }

    // =========================================================
    // HILFSMETHODEN (Für Netzwerk & JSON)
    // =========================================================

    // Nimmt uns die Arbeit ab, Header und Streams für jede Route neu zu schreiben
    private static void sendJsonResponse(HttpExchange exchange, String json) {
        try {
            Headers respHeaders = exchange.getResponseHeaders();
            respHeaders.add("Content-Type", "application/json; charset=utf-8");
            respHeaders.add("Access-Control-Allow-Origin", "*"); // WICHTIG für Frontend-Kommunikation

            byte[] resp = json.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, resp.length);
            
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(resp);
            }
        } catch (Exception e) {
            e.printStackTrace();
            try { exchange.sendResponseHeaders(500, -1); } catch (Exception ignored) {}
        }
    }

    private static String toJson(List<Map<String, String>> records) {
        if (records == null || records.isEmpty()) return "[]";
        StringBuilder sb = new StringBuilder();
        sb.append('[');
        boolean first = true;
        for (Map<String, String> r : records) {
            if (!first) sb.append(',');
            first = false;
            sb.append('{');
            boolean innerFirst = true;
            for (Map.Entry<String, String> e : r.entrySet()) {
                if (!innerFirst) sb.append(',');
                innerFirst = false;
                sb.append('"').append(escape(e.getKey())).append('"').append(':')
                  .append('"').append(escape(e.getValue())).append('"');
            }
            sb.append('}');
        }
        sb.append(']');
        return sb.toString();
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}