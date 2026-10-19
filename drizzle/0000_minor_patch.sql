CREATE TABLE `records` (
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `kind`, `id`)
);
