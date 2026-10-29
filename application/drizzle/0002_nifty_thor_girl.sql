ALTER TABLE `checkout_orders` ADD `policy_snapshot` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `business_product_starter_limit` BEFORE INSERT ON `business_products`
WHEN (SELECT count(*) FROM `business_products` WHERE `business_id` = NEW.`business_id`) >= 20
BEGIN
 SELECT RAISE(ABORT, 'Starter supports 20 catalogue products');
END;
