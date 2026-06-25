package com.trma1300;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;


public class ReadDatabase {
    private static String jdbcUrl = "jdbc:sqlite:java/src/main/resources/trmadatabase.db";

    public static void main() {
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

    public static ResultSet getAllTasks(){
        try{
            Connection connection = DriverManager.getConnection(jdbcUrl);
            if(connection == null) return null;

            Statement statement = connection.createStatement();
            String selectQuery = "SELECT * FROM tasks";
            ResultSet result = statement.executeQuery(selectQuery);

            return result;

        }catch (SQLException e){
            e.printStackTrace();
            return null;
        }
    }

    public static ResultSet getAllInvItems(){
        try{
            Connection connection = DriverManager.getConnection(jdbcUrl);
            if(connection == null) return null;

            Statement statement = connection.createStatement();
            String selectQuery = "SELECT * FROM inventory";
            ResultSet result = statement.executeQuery(selectQuery);

            return result;

        }catch (SQLException e){
            e.printStackTrace();
            return null;
        }
    }

        public static ResultSet getAllConnections(){
        try{
            Connection connection = DriverManager.getConnection(jdbcUrl);
            if(connection == null) return null;

            Statement statement = connection.createStatement();
            String selectQuery = "SELECT * FROM allocation";
            ResultSet result = statement.executeQuery(selectQuery);

            return result;

        }catch (SQLException e){
            e.printStackTrace();
            return null;
        }
    }
}
