CREATE TABLE `dropRedemptionTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(36) NOT NULL,
	`dropId` int NOT NULL,
	`userId` int NOT NULL,
	`claimId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`redeemedAt` timestamp,
	`redeemedByIp` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dropRedemptionTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `dropRedemptionTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `dropClaims` ADD `redeemedAt` timestamp;--> statement-breakpoint
ALTER TABLE `dropClaims` ADD `redemptionTokenId` int;