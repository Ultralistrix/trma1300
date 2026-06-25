package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class WriteDatabase {

    private static final String DB_URL = "jdbc:sqlite:database.db";

    public static void insertTask(Integer id, String name, String description, String assigned, Integer priority, String startdate, String enddate, Integer dependency){
        try (Connection connection = DriverManager.getConnection(DB_URL)) {
            
            String insertQuery = "INSERT INTO tasks (id, name, description, assigned, priority, startdate, enddate, dependency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

            if(dependency == null) {
                insertQuery = "INSERT INTO tasks (id, name, description, assigned, priority, startdate, enddate) VALUES (?, ?, ?, ?, ?, ?, ?)";
            }

            try (PreparedStatement preparedStatement = connection.prepareStatement(insertQuery)) {
                preparedStatement.setInt(1, id);
                preparedStatement.setString(2, name);
                preparedStatement.setString(3, description);
                preparedStatement.setString(4, assigned);
                preparedStatement.setInt(5, priority);
                preparedStatement.setString(6, startdate);
                preparedStatement.setString(7, enddate);
                
                if (dependency != null) {
                    preparedStatement.setInt(8, dependency);
                }

                // CRITICAL FIX: Actually execute the save command!
                preparedStatement.executeUpdate();
                System.out.println("Saved Task: " + name);
            }
        } catch (SQLException e){
            e.printStackTrace();
        }
    }

    public static void insertInventory(Integer id, String name, String description, Boolean reusable, String category, Integer ironmargin, Integer stock, Integer capacity){
        try (Connection connection = DriverManager.getConnection(DB_URL)) {
            
            // CRITICAL FIX: Changed table name from 'tasks' to 'inventory'
            String insertQuery = "INSERT INTO inventory (id, name, description, reusable, category, ironmargin, stock, capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            Integer reusableInteger = reusable ? 1 : 0;

            try (PreparedStatement preparedStatement = connection.prepareStatement(insertQuery)) {
                preparedStatement.setInt(1, id);
                preparedStatement.setString(2, name);
                preparedStatement.setString(3, description);
                preparedStatement.setInt(4, reusableInteger);
                preparedStatement.setString(5, category);
                preparedStatement.setInt(6, ironmargin);
                preparedStatement.setInt(7, stock);
                preparedStatement.setInt(8, capacity);

                // CRITICAL FIX: Actually execute the save command!
                preparedStatement.executeUpdate();
                System.out.println("Saved Inventory: " + name);
            }
        } catch (SQLException e){
            e.printStackTrace();
        }
    }

    // CRITICAL FIX: Added 'static' so Main can call it
    public static void connect(Integer taskId, Integer invId){
        try (Connection connection = DriverManager.getConnection(DB_URL)) {
            
            String insertQuery = "INSERT INTO allocation (task, inventory) VALUES (?, ?)";

            try (PreparedStatement preparedStatement = connection.prepareStatement(insertQuery)) {
                preparedStatement.setInt(1, taskId);
                preparedStatement.setInt(2, invId);
                
                // CRITICAL FIX: Actually execute the save command!
                preparedStatement.executeUpdate();
                System.out.println("Linked Task " + taskId + " with Inventory " + invId);
            }
        } catch (SQLException e){
            e.printStackTrace();
        }
    }
}