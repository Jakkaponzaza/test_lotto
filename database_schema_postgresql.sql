-- PostgreSQL Schema for Lotto API
-- Converted from MySQL schema

-- Create tables
CREATE TABLE IF NOT EXISTS "Prize" (
  prize_id SERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  rank INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "User" (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member', 'admin')),
  password VARCHAR(255),
  wallet DECIMAL(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS "Purchase" (
  purchase_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Ticket" (
  ticket_id SERIAL PRIMARY KEY,
  number VARCHAR(10) NOT NULL UNIQUE,
  price DECIMAL(8,2) NOT NULL DEFAULT 80.00,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'claimed')),
  created_by INTEGER REFERENCES "User"(user_id),
  purchase_id INTEGER REFERENCES "Purchase"(purchase_id) ON DELETE SET NULL,
  prize_id INTEGER REFERENCES "Prize"(prize_id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prize_rank ON "Prize"(rank);
CREATE INDEX IF NOT EXISTS idx_user_date ON "Purchase"(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ticket_number ON "Ticket"(number);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON "Ticket"(status);

-- Insert default admin user
INSERT INTO "User" (user_id, username, email, phone, role, password, wallet) 
VALUES (142, 'admin', 'admin@gmail.com', '0000000000', 'admin', 'admin1234', 0.00)
ON CONFLICT (username) DO NOTHING;

-- Reset sequence to start from 143 (after admin user)
SELECT setval('"User_user_id_seq"', 142, true);