ALTER TABLE `credentials` ADD `verifierName` varchar(255);--> statement-breakpoint
ALTER TABLE `credentials` ADD `verifierRole` varchar(255);--> statement-breakpoint
ALTER TABLE `credentials` ADD `verificationDate` date;--> statement-breakpoint
ALTER TABLE `credentials` ADD `evidenceUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `users` ADD `graduationDate` date;--> statement-breakpoint
ALTER TABLE `users` ADD `personalEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `alumniEmailToken` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `alumniEmailTokenExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `alumniEmailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `showAlumniBadge` boolean DEFAULT true NOT NULL;