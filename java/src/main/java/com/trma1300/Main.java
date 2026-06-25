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
        // Create a built-in Java HTTP server that listens on port 8080.
        // The '0' indicates the default system backlog for incoming connections.
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        // Define a specific route (endpoint) for our API: "http://localhost:8080/api/data"
        server.createContext("/api/data", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) {
                try {
                    // Security/Logic check: We only want to answer to GET requests.
                    // If a frontend tries to POST or DELETE, we reject it with a 405 (Method Not Allowed).
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        exchange.sendResponseHeaders(405, -1);
                        return;
                    }

                    // Default fallback message in case the file cannot be read
                    String sqlContent = "Couldn't load database schema.";

                    // Try to read the 'trmadatabaseschema.sql' file from the 'resources' folder inside the compiled JAR
                    try (InputStream is = Main.class.getResourceAsStream("/trmadatabaseschema.sql")) {
                        if (is != null) {
                            // If the file exists, read it line by line and combine it into a single String
                            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                                sqlContent = reader.lines().collect(Collectors.joining("\n"));
                            }
                        } else {
                            // Log a warning to the console if the file is missing
                            System.out.println("WARNING: trmdatabaseschema.sql was not found!");
                        }
                    } catch (Exception e) {
                        System.out.println("Error while reading the file: " + e.getMessage());
                    }

                    // Create a simulated database response structure.
                    // It mimics a table row with an 'id' and 'content' column.
                    List<Map<String, String>> records = new ArrayList<>();
                    Map<String, String> row = new HashMap<>();
                    row.put("id", "1");
                    row.put("content", sqlContent);
                    records.add(row);

                    // Convert our Java data structure into a JSON-formatted string
                    String json = toJson(records);

                    // Prepare the HTTP response headers
                    Headers respHeaders = exchange.getResponseHeaders();
                    // Tell the browser that we are sending JSON data
                    respHeaders.add("Content-Type", "application/json; charset=utf-8");
                    // Enable CORS: Allow any frontend (e.g., Nginx on another port) to read this data
                    respHeaders.add("Access-Control-Allow-Origin", "*");

                    // Convert the JSON string into raw bytes for transmission
                    byte[] resp = json.getBytes(StandardCharsets.UTF_8);
                    
                    // Send the HTTP status code 200 (OK) and the length of our payload
                    exchange.sendResponseHeaders(200, resp.length);
                    
                    // Actually write the data out to the network stream (sending it to the client)
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(resp);
                    }
                } catch (Exception ex) {
                    // If anything crashes during the process, catch the error 
                    // and send a 500 (Internal Server Error) to the client
                    ex.printStackTrace(); // Added this so you can see errors in Docker logs
                    try {
                        exchange.sendResponseHeaders(500, -1);
                    } catch (Exception ignored) {}
                }
            }
        });

        // Use the default threading mechanism for the server
        server.setExecutor(null);
        // Fire up the server!
        server.start();
        System.out.println("Server started on http://localhost:8080");
    }

    /**
     * Minimal custom JSON serialization tool.
     * This avoids needing heavy external dependencies like Gson or Jackson.
     * It converts a List of Key-Value Maps into a valid JSON array format: [{"key":"value"}]
     */
    private static String toJson(List<Map<String, String>> records) {
        StringBuilder sb = new StringBuilder();
        sb.append('['); // Start JSON array
        boolean first = true;
        
        for (Map<String, String> r : records) {
            if (!first) sb.append(',');
            first = false;
            sb.append('{'); // Start JSON object
            boolean innerFirst = true;
            
            for (Map.Entry<String, String> e : r.entrySet()) {
                if (!innerFirst) sb.append(',');
                innerFirst = false;
                
                // Format: "key":"value"
                sb.append('"').append(escape(e.getKey())).append('"').append(':')
                  .append('"').append(escape(e.getValue())).append('"');
            }
            sb.append('}'); // End JSON object
        }
        sb.append(']'); // End JSON array
        return sb.toString();
    }

    /**
     * Helper method to ensure special characters don't break the JSON format.
     * It escapes backslashes, double quotes, and line breaks.
     */
    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")    // Escape backslashes
                .replace("\"", "\\\"")    // Escape quotes
                .replace("\n", "\\n");    // Escape newlines
    }
}