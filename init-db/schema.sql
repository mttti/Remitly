
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    iso2 CHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    timezone VARCHAR(100)
);

CREATE TABLE banks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    swift_code VARCHAR(20) NOT NULL UNIQUE,
    is_headquarter BOOLEAN NOT NULL DEFAULT false,
    country_id INTEGER NOT NULL REFERENCES countries(id),
    parent_id INTEGER REFERENCES banks(id)
);