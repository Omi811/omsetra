CREATE TABLE `reconciliation_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`credit_id` text NOT NULL,
	`cash_amount` integer NOT NULL,
	`tds_amount` integer NOT NULL,
	`actor_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `reconciliation_organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `reconciliation_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credit_id`) REFERENCES `reconciliation_credits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reconciliation_allocations_credit_id_unique` ON `reconciliation_allocations` (`credit_id`);--> statement-breakpoint
CREATE TABLE `reconciliation_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`previous_state` text NOT NULL,
	`next_state` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `reconciliation_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reconciliation_credits` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`bank_label` text NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`narration` text NOT NULL,
	`reference` text NOT NULL,
	`counterparty` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `reconciliation_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reconciliation_credit_fingerprint` ON `reconciliation_credits` (`organization_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `reconciliation_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`number` text NOT NULL,
	`customer` text NOT NULL,
	`net_amount` integer NOT NULL,
	`gst_amount` integer NOT NULL,
	`gross_amount` integer NOT NULL,
	`issued_date` text NOT NULL,
	`due_date` text NOT NULL,
	`reference` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `reconciliation_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reconciliation_invoice_number` ON `reconciliation_invoices` (`organization_id`,`number`);--> statement-breakpoint
CREATE TABLE `reconciliation_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`gstin` text NOT NULL,
	`bank_ledger` text NOT NULL,
	`tds_ledger` text NOT NULL,
	`privacy_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reconciliation_owner_gstin` ON `reconciliation_organizations` (`owner_id`,`gstin`);
--> statement-breakpoint
CREATE TRIGGER reconciliation_allocation_guard BEFORE INSERT ON reconciliation_allocations
WHEN NEW.cash_amount <= 0 OR NEW.tds_amount < 0
 OR NOT EXISTS (SELECT 1 FROM reconciliation_credits WHERE id=NEW.credit_id AND organization_id=NEW.organization_id AND amount=NEW.cash_amount)
 OR NOT EXISTS (SELECT 1 FROM reconciliation_invoices WHERE id=NEW.invoice_id AND organization_id=NEW.organization_id)
 OR NEW.cash_amount+NEW.tds_amount+(SELECT coalesce(sum(cash_amount+tds_amount),0) FROM reconciliation_allocations WHERE invoice_id=NEW.invoice_id) > (SELECT gross_amount FROM reconciliation_invoices WHERE id=NEW.invoice_id)
BEGIN SELECT RAISE(ABORT,'Invalid or excessive reconciliation allocation'); END;
--> statement-breakpoint
CREATE TRIGGER reconciliation_audit_no_update BEFORE UPDATE ON reconciliation_audit BEGIN SELECT RAISE(ABORT,'Audit records are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER reconciliation_audit_no_delete BEFORE DELETE ON reconciliation_audit BEGIN SELECT RAISE(ABORT,'Audit records are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER reconciliation_org_limit BEFORE INSERT ON reconciliation_organizations WHEN (SELECT count(*) FROM reconciliation_organizations WHERE owner_id=NEW.owner_id)>=10 BEGIN SELECT RAISE(ABORT,'Beta workspace limit reached'); END;
--> statement-breakpoint
CREATE TRIGGER reconciliation_invoice_limit BEFORE INSERT ON reconciliation_invoices WHEN (SELECT count(*) FROM reconciliation_invoices WHERE organization_id=NEW.organization_id)>=200 BEGIN SELECT RAISE(ABORT,'Beta invoice limit reached'); END;
--> statement-breakpoint
CREATE TRIGGER reconciliation_credit_limit BEFORE INSERT ON reconciliation_credits WHEN (SELECT count(*) FROM reconciliation_credits WHERE organization_id=NEW.organization_id)>=200 BEGIN SELECT RAISE(ABORT,'Beta credit limit reached'); END;
