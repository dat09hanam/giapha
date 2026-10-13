-- Replace the pricing plan accent colours. Widen the enum first so existing plans can move
-- from a retired colour to its closest replacement, then drop the retired members.

-- AlterTable
ALTER TABLE `PricingPlan` MODIFY `tone` ENUM('WOOD', 'JADE', 'GOLD', 'LACQUER', 'ASH', 'SPROUT', 'TURQUOISE', 'AMETHYST', 'BRONZE', 'ONYX') NOT NULL DEFAULT 'WOOD';

UPDATE `PricingPlan` SET `tone` = 'BRONZE' WHERE `tone` = 'WOOD';
UPDATE `PricingPlan` SET `tone` = 'TURQUOISE' WHERE `tone` = 'JADE';
UPDATE `PricingPlan` SET `tone` = 'ONYX' WHERE `tone` = 'LACQUER';

-- AlterTable
ALTER TABLE `PricingPlan` MODIFY `tone` ENUM('GOLD', 'ASH', 'SPROUT', 'TURQUOISE', 'AMETHYST', 'BRONZE', 'ONYX') NOT NULL DEFAULT 'BRONZE';
