
-- iFastX WA Gateway - Database Schema

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50),
    daily_limit INT DEFAULT 0,
    max_instances INT DEFAULT 1,
    price DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    icon VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    role VARCHAR(20) NOT NULL,
    parent_id VARCHAR(50),
    plan_id VARCHAR(50),
    api_key VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    user_id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    expiry_date TIMESTAMP,
    messages_sent_today INT DEFAULT 0,
    messages_sent_this_month INT DEFAULT 0,
    messages_sent_this_year INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS instances (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'closed',
    phone_number VARCHAR(20),
    qr_code TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    webhook_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(255),
    url TEXT,
    type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_groups (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50),
    number VARCHAR(20),
    original VARCHAR(50),
    status_exists BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    instance_id VARCHAR(50),
    recipient VARCHAR(50),
    status VARCHAR(20),
    message_id TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auto_responder_rules (
    id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(50),
    trigger_keyword VARCHAR(255),
    response_message TEXT,
    media_url TEXT,
    media_type VARCHAR(20),
    parent_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    buttons_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(100) PRIMARY KEY,
    instance_id VARCHAR(50),
    remote_jid VARCHAR(50),
    from_me BOOLEAN DEFAULT FALSE,
    text TEXT,
    media_url TEXT,
    media_type VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

-- 2. Grant Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

-- 3. Seed Data
INSERT INTO plans (id, name, daily_limit, max_instances, price, description, icon) 
VALUES 
('p_basic', 'Basic', 500, 2, 1499.00, 'Ideal for small businesses starting their automation journey.', 'Package'),
('p_pro', 'Pro', 5000, 10, 4999.00, 'Advanced tools for scaling communication and bulk engagement.', 'Rocket'),
('p_enterprise', 'Enterprise', 0, 100, 24999.00, 'Unlimited possibilities with dedicated support and high speed.', 'Crown')
ON CONFLICT (id) DO UPDATE SET 
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

INSERT INTO users (id, username, role, password, plan_id, api_key, email) 
VALUES ('u_super_9595', '9595956392', 'superadmin', 'iFastX@Admin2024', 'p_enterprise', 'sk_super_9595', 'admin@ifastx.in') 
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (user_id, plan_id, status, expiry_date)
VALUES ('u_super_9595', 'p_enterprise', 'active', '2030-01-01 00:00:00')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(50),
    keyword VARCHAR(255),
    match_type VARCHAR(20) DEFAULT 'exact',
    reply_type VARCHAR(20) DEFAULT 'text',
    text_content TEXT,
    media_url TEXT,
    template_name VARCHAR(255),
    template_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);
