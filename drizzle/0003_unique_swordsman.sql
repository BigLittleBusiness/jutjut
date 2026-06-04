CREATE TABLE `dropViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dropId` int NOT NULL,
	`studentId` int,
	`sessionId` varchar(128),
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dropViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drops` ADD `sponsorshipFee` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `drops` ADD `impressions` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `jobApplications` ADD `contactSharedAtApplication` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `shareContactWithEmployers` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `yearLevel` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `postcode` varchar(10);