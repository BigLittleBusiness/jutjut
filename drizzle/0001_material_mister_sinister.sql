CREATE TABLE `creditTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employerId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('purchase','job_post','refund','promo_bonus','auto_repost') NOT NULL,
	`reference` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employerCredits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employerId` int NOT NULL,
	`creditBalance` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employerCredits_id` PRIMARY KEY(`id`),
	CONSTRAINT `employerCredits_employerId_unique` UNIQUE(`employerId`)
);
--> statement-breakpoint
CREATE TABLE `employers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`abn` varchar(16),
	`contactEmail` varchar(320),
	`contactPhone` varchar(32),
	`industry` varchar(128),
	`postcode` varchar(8),
	`visibleToSchools` boolean NOT NULL DEFAULT true,
	`acceptsWorkExperience` boolean NOT NULL DEFAULT false,
	`paymentToken` varchar(255),
	`isGstRegistered` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employers_id` PRIMARY KEY(`id`),
	CONSTRAINT `employers_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `jobViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`viewerUserId` int,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `placements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`employerId` int NOT NULL,
	`jobId` int,
	`startDate` varchar(16) NOT NULL,
	`endDate` varchar(16) NOT NULL,
	`hoursPerWeek` int NOT NULL,
	`status` enum('draft','pending_employer','approved_by_employer','approved_by_school','completed','rejected') NOT NULL DEFAULT 'draft',
	`studentSignature` text,
	`employerSignature` text,
	`schoolSignature` text,
	`employerToken` varchar(64),
	`employerComment` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `placements_id` PRIMARY KEY(`id`),
	CONSTRAINT `placements_employerToken_unique` UNIQUE(`employerToken`)
);
--> statement-breakpoint
CREATE TABLE `promoCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`discountType` enum('fixed','percentage') NOT NULL,
	`discountValue` int NOT NULL,
	`bonusCredits` int NOT NULL DEFAULT 0,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promoCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promoCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `promoRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promoCodeId` int NOT NULL,
	`promoCode` varchar(64) NOT NULL,
	`redeemedByUserId` int,
	`redeemedByEmployerId` int,
	`discountType` enum('fixed','percentage') NOT NULL,
	`discountValue` int NOT NULL,
	`bonusCreditsAwarded` int NOT NULL DEFAULT 0,
	`chargeToken` varchar(255),
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promoRedemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schoolStudents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schoolStudents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`careersContactName` varchar(255),
	`careersContactEmail` varchar(320),
	`phone` varchar(32),
	`state` varchar(3),
	`approved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`),
	CONSTRAINT `schools_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `waitlistSignups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(128),
	`role` enum('student','employer','other') NOT NULL DEFAULT 'student',
	`school` varchar(255),
	`source` varchar(64) NOT NULL DEFAULT 'landing_page',
	`ipAddress` varchar(64),
	`confirmed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waitlistSignups_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlistSignups_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `isFeatured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `featuredUntil` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `viewCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `applyCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `autoRepostEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `autoRepostNextDate` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `paymentToken` varchar(255);--> statement-breakpoint
ALTER TABLE `jobs` ADD `creditTransactionId` int;