package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;


public class ReadDatabase {
    public static void main() {
        String jdbcUrl = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";


        try {
            Connection connection = DriverManager.getConnection(jdbcUrl);
            if (connection == null) return;

            System.out.println("Conenction successfull");
            Statement statement = connection.createStatement();

            String selectQuery = "SELECT * FROM tasks";
            ResultSet result = statement.executeQuery(selectQuery);

            System.out.println("The available Data\n");

            while(result.next()){
                int id = result.getInt("id");
                String name = result.getString("name");
                String description = result.getString("description");

                System.out.println(id + " " + name + " " + description);
            }

            connection.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }

    }
}
