package com.trma1300;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ReadDatabase {

    public static List<Map<String, String>> getAllTasks() {
        List<Map<String, String>> records = new ArrayList<>();

        // Nutzt wieder Main.DB_URL für Docker-Kompatibilität!
        try (Connection connection = DriverManager.getConnection(Main.DB_URL);
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT * FROM tasks")) {

            while (result.next()) {
                Map<String, String> row = new HashMap<>();
                row.put("id", String.valueOf(result.getInt("id")));
                row.put("name", result.getString("name"));
                row.put("description", result.getString("description"));
                row.put("assigned", result.getString("assigned"));
                row.put("priority", String.valueOf(result.getInt("priority")));
                row.put("startdate", result.getString("startdate"));
                row.put("enddate", result.getString("enddate"));
                
                int dep = result.getInt("dependency");
                row.put("dependency", result.wasNull() ? "" : String.valueOf(dep));
                
                records.add(row);
            }
        } catch (SQLException e) {
            System.out.println("Error reading Tasks: " + e.getMessage());
        }
        return records;
    }

    public static List<Map<String, String>> getAllInvItems() {
        List<Map<String, String>> records = new ArrayList<>();

        try (Connection connection = DriverManager.getConnection(Main.DB_URL);
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT * FROM inventory")) {

            while (result.next()) {
                Map<String, String> row = new HashMap<>();
                row.put("id", String.valueOf(result.getInt("id")));
                row.put("name", result.getString("name"));
                row.put("description", result.getString("description"));
                row.put("reusable", String.valueOf(result.getInt("reusable")));
                row.put("category", result.getString("category"));
                row.put("ironmargin", String.valueOf(result.getInt("ironmargin")));
                row.put("stock", String.valueOf(result.getInt("stock")));
                row.put("capacity", String.valueOf(result.getInt("capacity")));
                
                records.add(row);
            }
        } catch (SQLException e) {
            System.out.println("Error reading Inventory: " + e.getMessage());
        }
        return records;
    }

    public static List<Map<String, String>> getAllConnections() {
        List<Map<String, String>> records = new ArrayList<>();

        try (Connection connection = DriverManager.getConnection(Main.DB_URL);
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT * FROM allocation")) {

            while (result.next()) {
                Map<String, String> row = new HashMap<>();
                // Aus der 'allocation' Tabelle holen wir die beiden verknüpften IDs
                row.put("task", String.valueOf(result.getInt("task")));
                row.put("inventory", String.valueOf(result.getInt("inventory")));
                
                records.add(row);
            }
        } catch (SQLException e) {
            System.out.println("Error reading Connections (Allocations): " + e.getMessage());
        }
        return records;
    }
}