CREATE TABLE `coursePathways` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`courseName` varchar(255) NOT NULL,
	`unitName` varchar(255),
	`discipline` varchar(255) NOT NULL,
	`level` varchar(128),
	`practicalType` enum('placement','project','cohort_brief','mixed') NOT NULL DEFAULT 'project',
	`description` text,
	`learningOutcomes` text,
	`eligibilitySummary` text,
	`requiredHours` int,
	`requiredDeliverables` text,
	`allowedDeliveryModes` text,
	`applicationOpenAt` timestamp,
	`applicationCloseAt` timestamp,
	`practicalStartAt` timestamp,
	`practicalEndAt` timestamp,
	`status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coursePathways_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institutionMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','coordinator','wil_officer') NOT NULL DEFAULT 'coordinator',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`providerType` enum('university','tafe','school','other') NOT NULL DEFAULT 'university',
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`state` varchar(3),
	`approved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `institutions_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `practicalApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`coursePathwayId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`availability` text,
	`statement` text NOT NULL,
	`skillsSummary` text,
	`status` enum('submitted','shortlisted','approved','waitlisted','declined','withdrawn') NOT NULL DEFAULT 'submitted',
	`reviewedByUserId` int,
	`reviewNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicalArrangements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`coursePathwayId` int NOT NULL,
	`opportunityId` int NOT NULL,
	`applicationId` int,
	`employerId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`approvedByUserId` int NOT NULL,
	`supervisorName` varchar(255) NOT NULL,
	`supervisorEmail` varchar(320) NOT NULL,
	`status` enum('approved','ready_to_commence','active','completion_pending','completed','cancelled') NOT NULL DEFAULT 'approved',
	`agreementConfirmedAt` timestamp,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`cancellationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalArrangements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicalCompletionRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arrangementId` int NOT NULL,
	`studentReflection` text,
	`supervisorFeedback` text,
	`supervisorConfirmedAt` timestamp,
	`coordinatorUserId` int,
	`coordinatorConfirmedAt` timestamp,
	`outcomeSummary` text,
	`status` enum('pending','supervisor_confirmed','completed','returned') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalCompletionRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `practicalCompletionRecords_arrangementId_unique` UNIQUE(`arrangementId`)
);
--> statement-breakpoint
CREATE TABLE `practicalConcerns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arrangementId` int NOT NULL,
	`raisedByUserId` int NOT NULL,
	`category` enum('safety','wellbeing','conduct','scope_change','other') NOT NULL DEFAULT 'other',
	`description` text NOT NULL,
	`status` enum('open','under_review','resolved') NOT NULL DEFAULT 'open',
	`assignedToUserId` int,
	`resolution` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalConcerns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicalMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arrangementId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueAt` timestamp,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('not_started','in_progress','submitted','confirmed','needs_revision') NOT NULL DEFAULT 'not_started',
	`evidenceUrl` text,
	`studentNote` text,
	`submittedAt` timestamp,
	`confirmedByUserId` int,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicalOpportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employerId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`type` enum('placement','project','cohort_brief') NOT NULL DEFAULT 'project',
	`title` varchar(255) NOT NULL,
	`businessNeed` text NOT NULL,
	`description` text NOT NULL,
	`deliveryMode` enum('on_site','remote','hybrid') NOT NULL DEFAULT 'hybrid',
	`location` varchar(255),
	`proposedStartAt` timestamp,
	`proposedEndAt` timestamp,
	`estimatedHours` int,
	`maxParticipants` int NOT NULL DEFAULT 1,
	`suggestedCourseAreas` text,
	`deliverables` text NOT NULL,
	`scopeExclusions` text,
	`toolsProvided` text,
	`supervisorName` varchar(255) NOT NULL,
	`supervisorTitle` varchar(255),
	`supervisorEmail` varchar(320) NOT NULL,
	`supervisionCadence` varchar(128) NOT NULL,
	`accessibilityInfo` text,
	`paymentDetails` text,
	`safetyAcknowledged` boolean NOT NULL DEFAULT false,
	`status` enum('draft','submitted','needs_information','approved','open','matching','active','completed','closed','cancelled') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalOpportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicalOpportunityReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`coursePathwayId` int NOT NULL,
	`reviewerUserId` int,
	`status` enum('submitted','needs_information','approved','declined') NOT NULL DEFAULT 'submitted',
	`reviewNotes` text,
	`conditions` text,
	`studentVisibility` boolean NOT NULL DEFAULT false,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicalOpportunityReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studentPracticalRequirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentUserId` int NOT NULL,
	`coursePathwayId` int NOT NULL,
	`status` enum('not_started','finding','applying','approved','active','completed','not_approved') NOT NULL DEFAULT 'finding',
	`plannedCompletionAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentPracticalRequirements_id` PRIMARY KEY(`id`)
);
