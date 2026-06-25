package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;

public class WriteDatabase {
    private static final String DB_URL = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";
    public static void addTask(String name, String description, String assigned, int priority, String startdate, String enddate, Integer dependency) {
    String insertQuery = "INSERT INTO tasks (name, description, assigned, priority, startdate, enddate, dependency) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = connection.prepareStatement(insertQuery)) {

            pstmt.setString(1, name);
            pstmt.setString(2, description);
            pstmt.setString(3, assigned);
            pstmt.setInt(4, priority);
            pstmt.setString(5, startdate);
            pstmt.setString(6, enddate);
            
            // If dependency is null, set it to SQL NULL; otherwise, set the integer value
            if (dependency != null) {
                pstmt.setInt(7, dependency);
            } else {
                pstmt.setNull(7, Types.INTEGER);
            }
            
            pstmt.executeUpdate();
            System.out.println("Successfully inserted task: " + name);

        } catch (SQLException e) {
            System.out.println("Database Write Error (Tasks): " + e.getMessage());
        }
        
    }
}
