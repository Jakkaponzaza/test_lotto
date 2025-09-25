--
-- Database Schema for Lotto API
-- Complete database structure with sample data
--

--
-- Table structure for table `Prize`
--

CREATE TABLE `Prize` (
  `prize_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `rank` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Purchase`
--

CREATE TABLE `Purchase` (
  `purchase_id` int NOT NULL,
  `user_id` int NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Ticket`
--

CREATE TABLE `Ticket` (
  `ticket_id` int NOT NULL,
  `number` varchar(10) NOT NULL,
  `price` decimal(8,2) NOT NULL DEFAULT '80.00',
  `status` enum('available','sold','claimed') DEFAULT 'available',
  `created_by` int DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `prize_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

CREATE TABLE `User` (
  `user_id` int NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `role` enum('owner','member','admin') NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `wallet` decimal(10,2) DEFAULT '0.00'
) ;

--
-- Dumping data for table `User`
--

INSERT INTO `User` (`user_id`, `username`, `email`, `phone`, `role`, `password`, `wallet`) VALUES
(142, 'admin', 'admin@gmail.com', '0000000000', 'admin', 'admin1234', 0.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Prize`
--
ALTER TABLE `Prize`
  ADD PRIMARY KEY (`prize_id`),
  ADD KEY `idx_prize_rank` (`rank`);

--
-- Indexes for table `Purchase`
--
ALTER TABLE `Purchase`
  ADD PRIMARY KEY (`purchase_id`),
  ADD KEY `idx_user_date` (`user_id`,`date`);

--
-- Indexes for table `Ticket`
--
ALTER TABLE `Ticket`
  ADD PRIMARY KEY (`ticket_id`),
  ADD UNIQUE KEY `number` (`number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `purchase_id` (`purchase_id`),
  ADD KEY `idx_number` (`number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `prize_id` (`prize_id`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `uniq_user_email` (`email`),
  ADD UNIQUE KEY `uniq_user_phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Prize`
--
ALTER TABLE `Prize`
  MODIFY `prize_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Purchase`
--
ALTER TABLE `Purchase`
  MODIFY `purchase_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Ticket`
--
ALTER TABLE `Ticket`
  MODIFY `ticket_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `User`
--
ALTER TABLE `User`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Purchase`
--
ALTER TABLE `Purchase`
  ADD CONSTRAINT `Purchase_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `Ticket`
--
ALTER TABLE `Ticket`
  ADD CONSTRAINT `Ticket_ibfk_2` FOREIGN KEY (`purchase_id`) REFERENCES `Purchase` (`purchase_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `Ticket_ibfk_3` FOREIGN KEY (`prize_id`) REFERENCES `Prize` (`prize_id`) ON DELETE SET NULL;
COMMIT;