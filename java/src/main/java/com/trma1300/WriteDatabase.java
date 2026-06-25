package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class WriteDatabase {
    public static void main() {
        String jdbcUrl = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";

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
}
