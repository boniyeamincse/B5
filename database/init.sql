-- Init script for B5 WAF Database

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'sqli', 'xss', 'ip_block'
    pattern TEXT NOT NULL,
    action VARCHAR(20) DEFAULT 'block', -- 'allow', 'block', 'log'
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default admin user (password: admin - hashing handled by backend later)
INSERT INTO users (username, password_hash) VALUES ('admin', 'admin');

-- Insert some initial rules
INSERT INTO rules (name, type, pattern, action) VALUES 
('Basic SQLi 1', 'sqli', '(?i)union.*select', 'block'),
('Basic XSS 1', 'xss', '(?i)<script', 'block');
