package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;


public class ReadDatabase {
    public static void main() {
        String jdbcUrl = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";

        try {
            Connection connection = DriverManager.getConnection(jdbcUrl);
            // Now you can use 'connection' to execute SQL queries.
            // Don't forget to close the connection when you're done.
            System.out.println("Conenction successfull");   
            connection.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
