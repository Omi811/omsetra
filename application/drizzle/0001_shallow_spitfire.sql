CREATE TABLE `business_products` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`duration` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`support_email` text NOT NULL,
	`address` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`terms` text NOT NULL,
	`privacy` text NOT NULL,
	`refunds` text NOT NULL,
	`policies_confirmed` integer DEFAULT 0 NOT NULL,
	`terms_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_owner_id_unique` ON `businesses` (`owner_id`);--> statement-breakpoint
CREATE TABLE `checkout_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text NOT NULL,
	`provider_order_id` text,
	`payment_id` text,
	`account_id` text NOT NULL,
	`mode` text NOT NULL,
	`buyer_token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`consent_version` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_orders_provider_order_id_unique` ON `checkout_orders` (`provider_order_id`);--> statement-breakpoint
CREATE TABLE `merchant_connections` (
	`business_id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`mode` text NOT NULL,
	`encrypted_tokens` text NOT NULL,
	`public_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`connected_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_connections_account_id_unique` ON `merchant_connections` (`account_id`);--> statement-breakpoint
CREATE TABLE `merchant_events` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`event` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`business_id` text NOT NULL,
	`mode` text NOT NULL,
	`expires_at` integer NOT NULL
);
