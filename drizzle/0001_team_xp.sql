CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `xp_awards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`issue_id` integer,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xp_awards_issue_idx` ON `xp_awards` (`issue_id`);--> statement-breakpoint
ALTER TABLE `columns` ADD `is_done` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `issues` ADD `assignee_id` integer REFERENCES members(id) ON DELETE set null;--> statement-breakpoint
-- Existing boards get the same default as new ones: the last column is done.
UPDATE `columns` SET `is_done` = 1 WHERE `position` = (
	SELECT MAX(`c`.`position`) FROM `columns` AS `c` WHERE `c`.`project_id` = `columns`.`project_id`
);