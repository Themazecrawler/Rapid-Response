-- Create necessary tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    auth_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('student', 'security', 'admin')),
    campus VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE emergency_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    building VARCHAR(255),
    floor VARCHAR(50),
    status VARCHAR(50) CHECK (status IN ('active', 'resolved', 'investigating')),
    priority VARCHAR(50) CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id)
);

CREATE TABLE emergency_contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    department VARCHAR(255),
    available BOOLEAN DEFAULT true
);

CREATE TABLE alert_responses (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES emergency_alerts(id),
    responder_id INTEGER REFERENCES users(id),
    action TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_attachments (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES emergency_alerts(id),
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX idx_alerts_status ON emergency_alerts(status);
CREATE INDEX idx_alerts_created_at ON emergency_alerts(created_at);