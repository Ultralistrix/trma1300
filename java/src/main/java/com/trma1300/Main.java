package com.trma1300;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        server.createContext("/api/data", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        exchange.sendResponseHeaders(405, -1);
                        return;
                    }

                    String fakeDbContent = "Couldn't load database content.";

                    try (InputStream is = Main.class.getResourceAsStream("/fakedb.md")) {
                        if (is != null) {
                            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                                fakeDbContent = reader.lines().collect(Collectors.joining("\n"));
                            }
                        } else {
                            System.out.println("WARNING: Database was not found!");
                        }
                    } catch (Exception e) {
                        System.out.println("Error while reading the file: " + e.getMessage());
                    }

                    List<Map<String, String>> records = new ArrayList<>();
                    Map<String, String> row = new HashMap<>();
                    row.put("id", "1");
                    row.put("content", fakeDbContent);
                    records.add(row);

                    String json = toJson(records);

                    Headers respHeaders = exchange.getResponseHeaders();
                    respHeaders.add("Content-Type", "application/json; charset=utf-8");
                    respHeaders.add("Access-Control-Allow-Origin", "*");

                    byte[] resp = json.getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, resp.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(resp);
                    }
                } catch (Exception ex) {
                    try {
                        exchange.sendResponseHeaders(500, -1);
                    } catch (Exception ignored) {}
                }
            }
        });

        server.setExecutor(null);
        server.start();
        System.out.println("Server started on http://localhost:8080");
    }

    // Minimal JSON serialization to avoid external deps
    private static String toJson(List<Map<String, String>> records) {
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