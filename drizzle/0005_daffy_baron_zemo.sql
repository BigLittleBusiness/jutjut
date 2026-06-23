ALTER TABLE `vouches` ADD `voucherEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `vouches` ADD `skillName` varchar(255);--> statement-breakpoint
ALTER TABLE `vouches` ADD `vouchToken` varchar(255);--> statement-breakpoint
ALTER TABLE `vouches` ADD `vouchTokenExpiry` datetime;--> statement-breakpoint
ALTER TABLE `waitlistSignups` ADD `lastName` varchar(128);