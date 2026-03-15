ALTER TABLE `Messages` RENAME COLUMN `rolls` TO `results`;--> statement-breakpoint
ALTER TABLE `Messages` ADD `rollTypeVersion` integer DEFAULT 1 NOT NULL;