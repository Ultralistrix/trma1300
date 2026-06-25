# TRMA1300 — Task and Inventory Management System

## Work in Progress

The following features are planned or currently in development:

- **Localisation** — Adding English as a supported language
- **Native Java UI** — A desktop UI written in Java that connects directly to the backend, replacing the web frontend
- **Mobile / Native Client** — A dedicated Android app (Java) or a cross-platform native client for Android and PC

---

TRMA1300 is a full-stack web application designed to manage operational tasks and track inventory levels. It features a robust dependency system where tasks can be linked to required inventory items, automatically tracking stock levels and alerting users when critical thresholds (iron margins) are breached.

---

## Architecture & Tech Stack

The application relies on a modern, containerized architecture separating the frontend, backend, and database layers:

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML, CSS, and JavaScript — served via Nginx |
| **Backend** | Java 17 with the lightweight Javalin REST framework |
| **Database** | SQLite, integrated into the Java backend via JDBC |
| **Infrastructure** | Docker and Docker Compose |

---

## Features

- **Task Management** — Create, assign, and track tasks with priorities, start dates, and end dates.
- **Inventory Tracking** — Manage reusable and consumable items, categorizing them and tracking stock levels.
- **Allocation System** — Link specific inventory items to tasks.
- **Automated Alerts** — Automatically calculate purchase plans and trigger warnings when inventory falls below defined minimum stock levels.
- **RESTful API** — Clean separation of frontend UI and backend data via HTTP endpoints.

---

## Prerequisites

Before running the project, ensure you have the following installed on your host machine:

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Ultralistrix/trma1300/
cd TRMA1300
```

### 2. Generate the Database

Before starting the application, initialize the SQLite database using the provided schema file:

```bash
sqlite3 trmadatabase.db < trmadatabaseschema.sql
```

This creates the database file with all the required tables and structure.

### 3. Start the Application

The project uses Docker Compose to build the Java backend via Maven and start the Nginx web server simultaneously.

Navigate to the `docker` directory and start the containers in detached mode:

```bash
cd docker
docker compose up -d --build
```

> **Note:** The `--build` flag ensures the Java backend is compiled freshly via the multi-stage Dockerfile before starting.

### 4. Access the Application

Once the containers are running, open your browser and navigate to:

| Service | URL |
|---|---|
| Frontend UI | http://localhost:8080 |
| Backend API | http://localhost:8081/api/ |

### 5. Stop the Application

To safely stop the running containers, run the following from inside the `docker` directory:

```bash
docker compose down
```

---

## API Documentation

The Java backend exposes the following REST endpoints. All data is transmitted and received in **JSON format**.

### Read Operations (GET)

| Endpoint | Description |
|---|---|
| `/api/tasks` | Retrieves a list of all scheduled tasks |
| `/api/inventory` | Retrieves all inventory items and current stock levels |
| `/api/connections` | Retrieves all allocations linking tasks to required inventory |

### Write Operations (POST)

| Endpoint | Description |
|---|---|
| `/api/add-task` | Creates a new task in the database |
| `/api/add-inventory` | Creates a new inventory item or updates existing stock |
| `/api/allocate` | Creates a dependency link between a task ID and an inventory ID |

---

## Project Structure

```
TRMA1300/
├── docker/                         # Infrastructure and deployment
│   └── docker-compose.yml
├── Frontend/                       # Nginx web root (static assets)
│   ├── css/
│   │   ├── base.css
│   │   ├── components.css
│   │   └── layout.css
│   ├── js/
│   │   ├── features/
│   │   │   ├── dashboard.js
│   │   │   ├── inventory.js
│   │   │   ├── tasks.js
│   │   │   └── timeline.js
│   │   ├── store/
│   │   │   └── store.js
│   │   └── utils/
│   │       └── dom.js
│   ├── pages/
│   └── index.html
├── java/                           # Backend application
│   ├── src/main/
│   │   ├── java/com/trma1300/
│   │   │   ├── Main.java
│   │   │   ├── ReadDatabase.java
│   │   │   └── WriteDatabase.java
│   │   └── resources/
│   │       ├── trmadatabase.db
│   │       └── trmadatabaseschema.sql
│   ├── test/
│   ├── target/
│   ├── Dockerfile                  # Multi-stage build instructions
│   └── pom.xml                     # Maven dependencies
└── nginx/
    └── nginx.conf
```

---

## Development Notes

If you are developing the Java backend locally using **Visual Studio Code**, the workspace is configured to recognize `/java/src/main/java` as the primary Java source path via `.vscode/settings.json`. This prevents package resolution errors when the `pom.xml` is located in a subdirectory.
