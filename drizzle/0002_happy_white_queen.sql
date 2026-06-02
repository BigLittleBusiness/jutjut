CREATE TABLE `adminLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`to_email` varchar(320) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`template_id` varchar(100) NOT NULL,
	`template_data` text,
	`status` enum('sent','bounced','complaint','delivered','failed') NOT NULL DEFAULT 'sent',
	`ses_message_id` varchar(256),
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`user_type` enum('student','employer','school') NOT NULL DEFAULT 'student',
	`marketing_emails` boolean NOT NULL DEFAULT false,
	`weekly_digest` boolean NOT NULL DEFAULT false,
	`drop_reminders` boolean NOT NULL DEFAULT false,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailPreferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `inAppNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`link` varchar(500),
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inAppNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentGatewaySettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyName` varchar(128) NOT NULL,
	`encryptedValue` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int NOT NULL,
	CONSTRAINT `paymentGatewaySettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentGatewaySettings_keyName_unique` UNIQUE(`keyName`)
);
--> statement-breakpoint
CREATE TABLE `schoolGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`groupName` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schoolRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolName` varchar(255) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`phone` varchar(32),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studentGroupMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`groupId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentGroupMemberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employerId` int NOT NULL,
	`amountCents` int NOT NULL,
	`pinpaymentsChargeId` varchar(255),
	`status` enum('pending','succeeded','refunded') NOT NULL DEFAULT 'pending',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employers` ADD `status` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `employers` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `employers` ADD `suspendedReason` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `reported` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `reportReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedReason` text;