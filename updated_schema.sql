-- ======================================================
-- Simplified database schema for WebSocket Lotto App
-- Only includes currently used tables
-- ======================================================

-- ตาราง User
DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(15) NOT NULL,
  `role` ENUM('owner', 'member', 'admin') NOT NULL DEFAULT 'member',
  `password` VARCHAR(255) NOT NULL,
  `wallet` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ตาราง Ticket
DROP TABLE IF EXISTS `Ticket`;
CREATE TABLE `Ticket` (
  `ticket_id` INT AUTO_INCREMENT PRIMARY KEY,
  `number` VARCHAR(10) NOT NULL UNIQUE,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 80.00,
  `status` ENUM('available', 'sold', 'claimed') DEFAULT 'available',
  `created_by` INT NULL,
  `purchase_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_ticket_status` (`status`),
  INDEX `idx_ticket_number` (`number`),
  FOREIGN KEY (`created_by`) REFERENCES `User`(`user_id`) ON DELETE SET NULL
);

-- ตาราง Purchase
DROP TABLE IF EXISTS `Purchase`;
CREATE TABLE `Purchase` (
  `purchase_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_price` DECIMAL(10,2) NOT NULL,
  
  INDEX `idx_purchase_user` (`user_id`),
  INDEX `idx_purchase_date` (`date`),
  FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE CASCADE
);

-- อัปเดต foreign key ในตาราง Ticket
ALTER TABLE `Ticket` 
ADD CONSTRAINT `fk_ticket_purchase` 
FOREIGN KEY (`purchase_id`) REFERENCES `Purchase`(`purchase_id`) ON DELETE SET NULL;

-- ตาราง Prize สำหรับเก็บผลรางวัล (ตรงกับ database_me)
DROP TABLE IF EXISTS `Prize`;
CREATE TABLE `Prize` (
  `prize_id` INT AUTO_INCREMENT PRIMARY KEY,
  `amont` DECIMAL(10,2) NOT NULL,
  `rank` INT NOT NULL,
  UNIQUE KEY `unique_rank` (`rank`)
);

-- สร้างผู้ใช้ Admin เริ่มต้น
INSERT INTO `User` (`username`, `email`, `phone`, `role`, `password`, `wallet`) 
VALUES ('admin', 'admin@lotto.com', '0000000000', 'owner', 'admin123', 0.00)
ON DUPLICATE KEY UPDATE username = username;

SELECT 'Database schema updated successfully!' AS message;