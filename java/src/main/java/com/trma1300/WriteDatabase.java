package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class WriteDatabase {
    private static String jdbcUrl = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";

    public static void main() {

        try {
            Connection connection = DriverManager.getConnection(jdbcUrl);

            String insertQuery = "INSERT INTO employees (first_name, last_name, age) VALUES (?, ?, ?)";
            PreparedStatement preparedStatement = connection.prepareStatement(insertQuery);
            preparedStatement.setString(1, "John");
            preparedStatement.setString(2, "Doe");
            preparedStatement.setInt(3, 30);
            preparedStatement.executeUpdate();

            preparedStatement.close();
            connection.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public static  void insertTask(Integer id, String name, String description, String assigned, Integer priority, String startdate, String enddate, Integer dependency){
        try {
            Connection connection = DriverManager.getConnection(jdbcUrl);
            
            String insertQuery = "INSERT INTO tasks (id, name, description, assigned, priority, startdate, enddate, dependency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

            if(dependency == null) insertQuery = "INSERT INTO tasks (id, name, description, assigned, priority, startdate, enddate) VALUES (?, ?, ?, ?, ?, ?, ?)";

            PreparedStatement preparedStatement = connection.prepareStatement(insertQuery);
            preparedStatement.setInt(1, id);
            preparedStatement.setString(2, name);
            preparedStatement.setString(3, description);
            preparedStatement.setString(4, assigned);
            preparedStatement.setInt(5, priority);
            preparedStatement.setString(6, startdate);
            preparedStatement.setString(7, enddate);
            if (dependency != null) preparedStatement.setInt(8, dependency);

            preparedStatement.close();
            connection.close();

        } catch (SQLException e){
            e.printStackTrace();
        }

    }

    public static  void insertInventory(Integer id, String name, String description, Boolean reusable, String category, Integer ironmargin, Integer stock, Integer capacity){
        try {
            Connection connection = DriverManager.getConnection(jdbcUrl);
            
            String insertQuery = "INSERT INTO tasks (id, name, description, reusable, category, ironmargin, stock, capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            Integer reusableInteger = 0;
            if(reusable) reusableInteger = 1;

            PreparedStatement preparedStatement = connection.prepareStatement(insertQuery);
            preparedStatement.setInt(1, id);
            preparedStatement.setString(2, name);
            preparedStatement.setString(3, description);
            preparedStatement.setInt(4, reusableInteger);
            preparedStatement.setString(5, category);
            preparedStatement.setInt(6, ironmargin);
            preparedStatement.setInt(7, stock);
            preparedStatement.setInt(8, capacity);

            preparedStatement.close();
            connection.close();

        } catch (SQLException e){
            e.printStackTrace();
        }

    }

    public void connect(Integer taskId, Integer invId){
        try{
            Connection connection = DriverManager.getConnection(jdbcUrl);
            String inserQuery = "INSERT INTO allocation(task, inventory) VALUES(?, ?)";

            PreparedStatement preparedStatement = connection.prepareStatement(inserQuery);
            
            preparedStatement.setInt(1, taskId);
            preparedStatement.setInt(2, invId);
            preparedStatement.close();

            connection.close();

        }catch (SQLException e){
            e.printStackTrace();
        }


    }

}
