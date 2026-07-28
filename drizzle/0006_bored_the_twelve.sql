ALTER TABLE `transactions` ADD `stripeChargeId` varchar(255);--> statement-breakpoint
ALTER TABLE `transactions` ADD `gateway` enum('pin','stripe') DEFAULT 'pin' NOT NULL;