import { db } from '../server/db';
import type { UserRole } from '../src/types/index';

const OWNER_ROLE: UserRole = 'OWNER';
const MANAGER_ROLE: UserRole = 'MANAGER';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('TAGPUAN ERP — PHASE 3 COMPREHENSIVE AUTOMATED TESTS');
  console.log('PRODUCTS, INGREDIENTS, RECIPES & INVENTORY ENGINE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // Test 1: Product Master Seeding & Fetch
    const products = db.getProducts('ALL');
    assert(products.length >= 10, `Product Catalog seeded: Found ${products.length} products (expected >= 10)`);
    const cheeseBurger = products.find(p => p.product_code === 'BUR-03' || p.product_name.includes('Cheese Burger'));
    assert(!!cheeseBurger, `Cheese Burger product present: ${cheeseBurger?.product_name} (Code: ${cheeseBurger?.product_code})`);

    // Test 2: Ingredient Master Seeding & Extraction Codes
    const ingredients = db.getIngredients();
    assert(ingredients.length >= 15, `Ingredient Catalog seeded: Found ${ingredients.length} ingredients`);
    const beefPatty = ingredients.find(i => i.item_name.toLowerCase().includes('patties') || i.item_code.includes('PATTY'));
    const burgerBun = ingredients.find(i => i.item_name.toLowerCase().includes('patty bread') || i.item_name.toLowerCase().includes('bun'));
    const cheeseSlice = ingredients.find(i => i.item_name.toLowerCase().includes('cheese'));
    assert(!!beefPatty && !!burgerBun && !!cheeseSlice, `Core burger ingredients present (${beefPatty?.item_name}, ${burgerBun?.item_name}, ${cheeseSlice?.item_name})`);

    // Test 3: Recipe Resolution
    if (cheeseBurger) {
      const recipe = db.getRecipeByProductId(cheeseBurger.id);
      assert(!!recipe, `Recipe resolved for ${cheeseBurger.product_name}`);
      assert((recipe?.items?.length || 0) >= 3, `Recipe contains ${recipe?.items.length} components (Patty, Bun, Cheese, Sauce)`);
      console.log(`   Components for ${cheeseBurger.product_name}:`, recipe?.items.map(i => `${i.quantity_consumed} ${i.unit} ${i.ingredient_name}`).join(', '));
    }

    // Test 4: Branch Inventory Seeding across 17 Branches
    const branches = db.getBranches(OWNER_ROLE, null);
    assert(branches.length >= 17, `17 Tagpuan branches verified in DB: Found ${branches.length}`);
    const branch1 = branches[0];
    const branch1Inventory = db.getBranchInventory(OWNER_ROLE, null, branch1.id);
    assert(branch1Inventory.length >= 15, `Branch ${branch1.name} inventory seeded: ${branch1Inventory.length} items`);

    // Test 5: Role-Based Access Isolation (Manager restricted to assigned branch)
    const branch2 = branches[1];
    const managerRestrictedInv = db.getBranchInventory(MANAGER_ROLE, branch1.id, branch2.id);
    // Manager should be forced to branch1 (their assigned branch), not branch2
    const allBelongToAssignedBranch = managerRestrictedInv.every(item => item.branch_id === branch1.id);
    assert(allBelongToAssignedBranch, `RLS Branch Isolation: Manager forced to assigned branch (${branch1.id}), cannot leak branch ${branch2.id}`);

    // Test 6: Stock Movements - Stock In
    if (beefPatty) {
      const branch1InvList = db.getBranchInventory(OWNER_ROLE, null, branch1.id);
      const initialStock = branch1InvList.find(i => i.ingredient_id === beefPatty.id)?.current_stock || 0;
      const stockInQty = 25;
      const stockInResult = db.stockIn(
        OWNER_ROLE,
        'owner-user-id',
        'owner@tagpuan.ph',
        {
          branch_id: branch1.id,
          ingredient_id: beefPatty.id,
          quantity: stockInQty,
          reason: 'Supplier Delivery Truck #402'
        }
      );
      const afterStockIn = db.getBranchInventory(OWNER_ROLE, null, branch1.id).find(i => i.ingredient_id === beefPatty.id)?.current_stock || 0;
      assert(afterStockIn === initialStock + stockInQty, `Stock In applied accurately: ${initialStock} + ${stockInQty} = ${afterStockIn}`);
      assert(stockInResult.transaction.transaction_type === 'STOCK_IN', `Stock In transaction logged with type STOCK_IN`);

      // Test 7: Stock Movements - Stock Adjustment
      const adjustResult = db.adjustStock(
        OWNER_ROLE,
        'owner-user-id',
        'owner@tagpuan.ph',
        {
          branch_id: branch1.id,
          ingredient_id: beefPatty.id,
          new_stock: 50,
          reason: 'Physical Count Audit'
        }
      );
      const afterAdjust = db.getBranchInventory(OWNER_ROLE, null, branch1.id).find(i => i.ingredient_id === beefPatty.id)?.current_stock || 0;
      assert(afterAdjust === 50, `Stock Adjustment applied: stock is now ${afterAdjust}`);
      assert(adjustResult.transaction.previous_stock === afterStockIn && adjustResult.transaction.new_stock === 50, 'Adjustment transaction records previous and new stock');

      // Test 8: Stock Movements - Reject / Spoilage
      const rejectResult = db.recordRejectedStock(
        OWNER_ROLE,
        'owner-user-id',
        'owner@tagpuan.ph',
        {
          branch_id: branch1.id,
          ingredient_id: beefPatty.id,
          rejected_quantity: 2,
          reason: 'Damaged vacuum seal'
        }
      );
      assert(rejectResult.transaction.transaction_type === 'REJECT', `Rejection transaction logged`);
    }

    // Test 9: Atomic Recipe Deduction Engine - Validation & Execution
    if (cheeseBurger && beefPatty && burgerBun && cheeseSlice) {
      console.log('\n--- ATOMIC RECIPE DEDUCTION ENGINE TESTS ---');
      // Set predictable stock levels for all recipe ingredients in branch 1
      const recipe = db.getRecipeByProductId(cheeseBurger.id);
      if (recipe) {
        for (const item of recipe.items) {
          db.adjustStock(OWNER_ROLE, 'owner-id', 'owner@tagpuan.ph', {
            branch_id: branch1.id,
            ingredient_id: item.ingredient_id,
            new_stock: 10,
            reason: 'Reset for atomic test'
          });
        }
      }

      // Pre-validation for 2 Cheese Burgers
      const validCheck = db.validateProductDeduction(branch1.id, cheeseBurger.id, 2);
      assert(validCheck.valid === true, 'Pre-validation succeeds when all components sufficient');
      assert(validCheck.items_needed.length >= 3, `Pre-validation details ${validCheck.items_needed.length} recipe components`);

      // Execute atomic deduction of 2 Cheese Burgers
      const deductionResult = db.deductProductInventory(
        OWNER_ROLE,
        'cashier-id',
        'cashier@tagpuan.ph',
        branch1.id,
        cheeseBurger.id,
        2,
        'POS Sale Order #1001'
      );
      assert(deductionResult.success === true, 'Atomic deduction for 2 Cheese Burgers succeeded');
      assert(deductionResult.transactions.length >= 3, `Logged ${deductionResult.transactions.length} ingredient deduction transactions`);

      const branch1InvAfter = db.getBranchInventory(OWNER_ROLE, null, branch1.id);
      const pattyAfter = branch1InvAfter.find(i => i.ingredient_id === beefPatty.id)?.current_stock;
      const bunAfter = branch1InvAfter.find(i => i.ingredient_id === burgerBun.id)?.current_stock;
      const cheeseAfter = branch1InvAfter.find(i => i.ingredient_id === cheeseSlice.id)?.current_stock;
      assert(pattyAfter === 8, `Patty deducted accurately: 10 - 2 = ${pattyAfter}`);
      assert(bunAfter === 8, `Bun deducted accurately: 10 - 2 = ${bunAfter}`);
      assert(cheeseAfter === 8, `Cheese slice deducted accurately: 10 - 2 = ${cheeseAfter}`);

      // Test 10: ATOMIC ROLLBACK / SHORTFALL PREVENTION
      // Attempt to deduct 50 Cheese Burgers when only 8 patties exist
      console.log('\n--- TESTING ATOMIC SHORTFALL REJECTION ---');
      let failedAsExpected = false;
      try {
        db.deductProductInventory(
          OWNER_ROLE,
          'cashier-id',
          'cashier@tagpuan.ph',
          branch1.id,
          cheeseBurger.id,
          50,
          'Excessive Order that must fail'
        );
      } catch (err: any) {
        failedAsExpected = true;
        console.log(`   Caught expected atomic error: "${err.message}"`);
      }
      assert(failedAsExpected, 'Atomic deduction rejected when ingredient stock is insufficient');

      // Verify ZERO partial deductions occurred (Atomic guarantee)
      const branch1InvAfterFail = db.getBranchInventory(OWNER_ROLE, null, branch1.id);
      const pattyUnchanged = branch1InvAfterFail.find(i => i.ingredient_id === beefPatty.id)?.current_stock;
      const bunUnchanged = branch1InvAfterFail.find(i => i.ingredient_id === burgerBun.id)?.current_stock;
      const cheeseUnchanged = branch1InvAfterFail.find(i => i.ingredient_id === cheeseSlice.id)?.current_stock;
      assert(
        pattyUnchanged === 8 && bunUnchanged === 8 && cheeseUnchanged === 8,
        `Atomic Guarantee: All stock levels remain completely unchanged after failure (${pattyUnchanged}, ${bunUnchanged}, ${cheeseUnchanged})`
      );
    }

    // Test 11: Low Stock Events & Notifications
    console.log('\n--- TESTING LOW STOCK EVENT TRIGGERS ---');
    if (beefPatty) {
      // Set stock to 2 (below reorder level of 10)
      db.adjustStock(OWNER_ROLE, 'owner-id', 'owner@tagpuan.ph', {
        branch_id: branch1.id,
        ingredient_id: beefPatty.id,
        new_stock: 2,
        reason: 'Simulate stock exhaustion'
      });
      const lowStockEvents = db.getLowStockEvents(OWNER_ROLE, null, branch1.id, 'OPEN');
      const pattyEvent = lowStockEvents.find(e => e.ingredient_id === beefPatty.id);
      assert(!!pattyEvent, `Automated Low Stock Incident logged for ${beefPatty.item_name} at stock 2`);
    }

    // Test 12: Audit Trail Logging
    const auditLogs = db.getAuditLogs(OWNER_ROLE, null, 'owner-id');
    const hasInventoryLogs = auditLogs.some(l => l.entity_type === 'INVENTORY' || l.entity_type === 'STOCK_MOVEMENT');
    assert(hasInventoryLogs, 'Inventory actions permanently logged in Tagpuan immutable audit trail');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runPhase3Tests();
