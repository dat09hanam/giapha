-- Display-only "was" price shown struck through on the pricing card; null = none.
ALTER TABLE `PricingPlan`
    ADD COLUMN `originalPrice` INTEGER NULL;
