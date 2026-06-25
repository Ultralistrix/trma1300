CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    assigned TEXT,
    priority INTEGER,
    startdate DATE,
    enddate DATE,
    dependency INTEGER,
    FOREIGN KEY(dependency) REFERENCES tasks(id)
);
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    reusable INTEGER,
    category TEXT,
    ironmargin INTEGER,
    stock INTEGER,
    capacity INTEGER
);
