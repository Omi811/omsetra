CREATE TABLE `workspace_onboarding` (
	`business_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`organization_id` text,
	`profile_digest` text DEFAULT '' NOT NULL,
	`finished_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `businesses`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `reconciliation_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TRIGGER onboarding_insert_guard BEFORE INSERT ON workspace_onboarding
BEGIN
 SELECT CASE WHEN NEW.role NOT IN ('founder','business','accountant') OR NEW.version <> 1 THEN RAISE(ABORT,'Invalid onboarding state') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM businesses WHERE id=NEW.business_id AND owner_id=NEW.owner_id) THEN RAISE(ABORT,'Onboarding owner mismatch') END;
 SELECT CASE WHEN NEW.organization_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM reconciliation_organizations WHERE id=NEW.organization_id AND owner_id=NEW.owner_id) THEN RAISE(ABORT,'Onboarding organization owner mismatch') END;
END;
--> statement-breakpoint
CREATE TRIGGER onboarding_update_guard BEFORE UPDATE ON workspace_onboarding
BEGIN
 SELECT CASE WHEN NEW.business_id <> OLD.business_id OR NEW.owner_id <> OLD.owner_id OR NEW.version <> OLD.version + 1 OR NEW.role NOT IN ('founder','business','accountant') THEN RAISE(ABORT,'Invalid onboarding update') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM businesses WHERE id=NEW.business_id AND owner_id=NEW.owner_id) THEN RAISE(ABORT,'Onboarding owner mismatch') END;
 SELECT CASE WHEN NEW.organization_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM reconciliation_organizations WHERE id=NEW.organization_id AND owner_id=NEW.owner_id) THEN RAISE(ABORT,'Onboarding organization owner mismatch') END;
END;
