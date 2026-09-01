CREATE TABLE `studentSourcedPracticals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentUserId` int NOT NULL,
	`coursePathwayId` int NOT NULL,
	`hostOrganisationName` varchar(255) NOT NULL,
	`hostContactName` varchar(255),
	`hostContactEmail` varchar(320),
	`proposedTitle` varchar(255) NOT NULL,
	`proposedDescription` text NOT NULL,
	`status` enum('submitted','awaiting_host','under_review','approved','declined','cancelled') NOT NULL DEFAULT 'submitted',
	`coordinatorNote` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentSourcedPracticals_id` PRIMARY KEY(`id`)
);
