/**
 * ============================================================================
 * TAGPUAN: HOME OF AUTHENTIC BURGER & SIOMAI - ENTERPRISE ERP
 * STANDALONE GOOGLE APPS SCRIPT WEB APP API (Code.gs)
 * ============================================================================
 *
 * HOW TO DEPLOY IN GOOGLE SHEETS:
 * 1. Open a new or existing Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace all code in `Code.gs` with this entire script and click Save (Ctrl+S).
 * 4. Run `setupTagpuanSheets()` once from the toolbar to initialize the 3 tabs
 *    ("Orders_Log", "Menu_Inventory", "Sales_Audit") and seed initial data.
 * 5. Click "Deploy" -> "New deployment":
 *    - Select type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (required for CORS-free SPA fetch requests)
 * 6. Copy the generated Web App URL (`https://script.google.com/macros/s/.../exec`)
 *    and paste it into Tagpuan ERP (or set `VITE_GOOGLE_SCRIPT_URL` in `.env`).
 * ============================================================================
 */

var TAB_ORDERS_LOG = 'Orders_Log';
var TAB_MENU_INVENTORY = 'Menu_Inventory';
var TAB_SALES_AUDIT = 'Sales_Audit';
var DEFAULT_DRIVE_FOLDER_NAME = 'Tagpuan_ERP_Drive_Archive';

/**
 * Handles HTTP GET requests from Tagpuan ERP (POS, Kiosk, KDS, Inventory, Sales Audit)
 * Query parameters supported:
 * - action: 'getMenu' | 'GET_ALL' | 'GET_ORDERS' | 'GET_MENU_INVENTORY' | 'GET_SALES_AUDIT' | 'PING'
 * - branch: optional branch name or ID filter
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var rawAction = params.action || 'GET_ALL';
    var action = rawAction.toUpperCase();
    var branchFilter = params.branch || '';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureTabsExist_(ss);

    if (action === 'PING') {
      return jsonResponse_({
        success: true,
        status: 'ONLINE',
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'GETMENU' || action === 'GET_MENU' || action === 'GET_MENU_INVENTORY') {
      var menuRows = readTabAsObjects_(ss.getSheetByName(TAB_MENU_INVENTORY), '');
      return jsonResponse_({
        success: true,
        action: 'getMenu',
        menu: menuRows,
        menu_inventory: menuRows,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'GET_ORDERS' || action === 'GETORDERS') {
      return jsonResponse_({
        success: true,
        orders_log: readTabAsObjects_(ss.getSheetByName(TAB_ORDERS_LOG), branchFilter),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'GET_SALES_AUDIT' || action === 'GETAUDIT') {
      return jsonResponse_({
        success: true,
        sales_audit: readTabAsObjects_(ss.getSheetByName(TAB_SALES_AUDIT), branchFilter),
        timestamp: new Date().toISOString()
      });
    }

    // Default: GET_ALL returns all 3 tabs in one round-trip for low-latency hydration
    var allMenuRows = readTabAsObjects_(ss.getSheetByName(TAB_MENU_INVENTORY), '');
    return jsonResponse_({
      success: true,
      menu: allMenuRows,
      orders_log: readTabAsObjects_(ss.getSheetByName(TAB_ORDERS_LOG), branchFilter),
      menu_inventory: allMenuRows,
      sales_audit: readTabAsObjects_(ss.getSheetByName(TAB_SALES_AUDIT), branchFilter),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: String(err && err.message ? err.message : err),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handles HTTP POST requests from Tagpuan ERP
 * Uses Text/Plain or Application/JSON payload to avoid preflight CORS blocks in browsers.
 * Actions supported:
 * - 'createOrder' / 'LOG_ORDER' / 'UPDATE_ORDER_STATUS': Appends or updates a row in Tab 1 ("Orders_Log")
 * - 'UPSERT_MENU_INVENTORY' / 'DEDUCT_INVENTORY': Updates stock levels or items in Tab 2 ("Menu_Inventory")
 * - 'saveAudit' / 'LOG_SALES_AUDIT': Appends or updates daily remittances, variance, and sales closing reports in Tab 3 ("Sales_Audit")
 * - 'SAVE_PDF_TO_DRIVE': Generates & saves PDF Sales Summaries and e-Receipts into Google Drive
 * - 'BATCH_SYNC': Flushes queued offline IndexedDB/LocalStorage mutations in a single atomic transaction
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for concurrent POS/Kiosk requests
    lock.waitLock(10000);

    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(rawBody);
    var rawAction = payload.action || '';
    var action = rawAction.toUpperCase();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureTabsExist_(ss);

    if (action === 'CREATEORDER' || action === 'CREATE_ORDER' || action === 'LOG_ORDER' || action === 'UPSERT_ORDER') {
      var orderData = payload.order || payload.data || payload;
      var orderResult = upsertOrderRow_(ss.getSheetByName(TAB_ORDERS_LOG), orderData);
      // Optionally deduct recipe inventory if items are provided
      var orderItems = payload.items || (orderData && orderData.items) || [];
      if ((payload.deductInventory || orderData.status === 'PAID' || orderData.payment_status === 'PAID') && orderItems.length > 0) {
        deductInventoryFromOrder_(ss.getSheetByName(TAB_MENU_INVENTORY), orderItems);
      }
      // Optionally auto-generate e-Receipt PDF in Drive if requested
      var driveReceipt = null;
      if (payload.autoSaveReceiptPdf && payload.receiptPdf) {
        driveReceipt = savePdfToDriveFolder_(payload.receiptPdf);
      }
      return jsonResponse_({
        success: true,
        action: 'createOrder',
        order: orderResult,
        driveReceipt: driveReceipt,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'UPDATE_ORDER_STATUS') {
      var statusResult = updateOrderStatusRow_(ss.getSheetByName(TAB_ORDERS_LOG), payload);
      return jsonResponse_({
        success: true,
        action: action,
        order: statusResult,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'UPSERT_MENU_INVENTORY') {
      var itemResult = upsertMenuInventoryRow_(ss.getSheetByName(TAB_MENU_INVENTORY), payload.data || payload);
      return jsonResponse_({
        success: true,
        action: action,
        item: itemResult,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'DEDUCT_INVENTORY') {
      var deductResult = deductInventoryFromOrder_(ss.getSheetByName(TAB_MENU_INVENTORY), payload.items || []);
      return jsonResponse_({
        success: true,
        action: action,
        updatedItems: deductResult,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'SAVEAUDIT' || action === 'SAVE_AUDIT' || action === 'LOG_SALES_AUDIT') {
      var auditResult = appendSalesAuditRow_(ss.getSheetByName(TAB_SALES_AUDIT), payload.audit || payload.data || payload);
      return jsonResponse_({
        success: true,
        action: 'saveAudit',
        audit: auditResult,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'SAVE_PDF_TO_DRIVE') {
      var driveFile = savePdfToDriveFolder_(payload.data || payload);
      return jsonResponse_({
        success: true,
        action: action,
        file: driveFile,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'BATCH_SYNC') {
      var operations = payload.operations || [];
      var results = [];
      for (var i = 0; i < operations.length; i++) {
        var op = operations[i];
        var opType = (op.action || '').toUpperCase();
        var opPayload = op.data || op;
        if (opType === 'CREATEORDER' || opType === 'CREATE_ORDER' || opType === 'LOG_ORDER' || opType === 'UPSERT_ORDER') {
          results.push(upsertOrderRow_(ss.getSheetByName(TAB_ORDERS_LOG), opPayload.order || opPayload.data || opPayload));
        } else if (opType === 'UPDATE_ORDER_STATUS') {
          results.push(updateOrderStatusRow_(ss.getSheetByName(TAB_ORDERS_LOG), opPayload));
        } else if (opType === 'UPSERT_MENU_INVENTORY') {
          results.push(upsertMenuInventoryRow_(ss.getSheetByName(TAB_MENU_INVENTORY), opPayload.data || opPayload));
        } else if (opType === 'DEDUCT_INVENTORY') {
          results.push(deductInventoryFromOrder_(ss.getSheetByName(TAB_MENU_INVENTORY), opPayload.items || []));
        } else if (opType === 'SAVEAUDIT' || opType === 'SAVE_AUDIT' || opType === 'LOG_SALES_AUDIT') {
          results.push(appendSalesAuditRow_(ss.getSheetByName(TAB_SALES_AUDIT), opPayload.audit || opPayload.data || opPayload));
        } else if (opType === 'SAVE_PDF_TO_DRIVE') {
          results.push(savePdfToDriveFolder_(opPayload.data || opPayload));
        }
      }
      return jsonResponse_({
        success: true,
        action: 'BATCH_SYNC',
        syncedCount: results.length,
        results: results,
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse_({
      success: false,
      error: 'Unsupported action: ' + action
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: String(err && err.message ? err.message : err),
      timestamp: new Date().toISOString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Run this function once in the Apps Script Editor to create and seed all 3 tabs
 */
function setupTagpuanSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTabsExist_(ss);
  return 'Tagpuan ERP Google Sheets tabs (Orders_Log, Menu_Inventory, Sales_Audit) initialized successfully!';
}

/**
 * Ensures the 3 required tabs exist with exact required column headers and initial seed data
 */
function ensureTabsExist_(ss) {
  // 1. Tab 1: "Orders_Log" (Order ID, Branch, Items, Amount, Payment Status, Timestamp, Kitchen Status, Source, Customer Name, Metadata JSON)
  var ordersSheet = ss.getSheetByName(TAB_ORDERS_LOG);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(TAB_ORDERS_LOG);
    var orderHeaders = [
      'Order ID',
      'Branch',
      'Items',
      'Amount',
      'Payment Status',
      'Timestamp',
      'Kitchen Status',
      'Source',
      'Customer Name',
      'Metadata JSON'
    ];
    ordersSheet.appendRow(orderHeaders);
    styleHeaderRow_(ordersSheet, orderHeaders.length);

    // Seed sample order row
    var nowIso = new Date().toISOString();
    ordersSheet.appendRow([
      'TAG-0001',
      'Tagpuan - Narra Branch',
      '2x Pork Siomai (4 pcs), 1x Cheeseburger, 1x Coca-Cola (Mismo)',
      180.00,
      'PAID',
      nowIso,
      'READY',
      'POS',
      'Walk-in Customer',
      JSON.stringify({
        id: 'ord-seed-1',
        order_number: 'TAG-0001',
        branch_id: 'c561fe5a-c31c-4657-b040-562004c9daba',
        branch_name: 'Tagpuan - Narra Branch',
        payment_method: 'CASH',
        dining_option: 'DINE_IN'
      })
    ]);
  }

  // 2. Tab 2: "Menu_Inventory" (Item Name, Price, Category, Stock Level, Recipe Ingredients, Item Code, Unit, Record Type)
  var menuSheet = ss.getSheetByName(TAB_MENU_INVENTORY);
  if (!menuSheet) {
    menuSheet = ss.insertSheet(TAB_MENU_INVENTORY);
    var menuHeaders = [
      'Item Name',
      'Price',
      'Category',
      'Stock Level',
      'Recipe Ingredients',
      'Item Code',
      'Unit',
      'Record Type'
    ];
    menuSheet.appendRow(menuHeaders);
    styleHeaderRow_(menuSheet, menuHeaders.length);

    var seedMenuAndInventory = [
      // Menu Items with Recipe Ingredients & Available Servings Stock
      ['Authentic Classic Burger', 45.00, 'BURGERS', 150, 'Patty Bread: 1 pcs, Patties: 1 pcs, Ketchup: 0.01 gal, Mayo: 0.01 gal', 'BGR-01', 'serving', 'MENU_ITEM'],
      ['Authentic Cheeseburger', 55.00, 'BURGERS', 150, 'Patty Bread: 1 pcs, Patties: 1 pcs, OK Cheese: 1 pcs, Ketchup: 0.01 gal, Mayo: 0.01 gal', 'BGR-02', 'serving', 'MENU_ITEM'],
      ['Egg Burger Special', 55.00, 'BURGERS', 120, 'Patty Bread: 1 pcs, Patties: 1 pcs, Egg: 1 pcs, Mayo: 0.01 gal', 'BGR-03', 'serving', 'MENU_ITEM'],
      ['Pork Siomai (4 pcs)', 50.00, 'SPECIALTY', 350, 'Siomai: 4 pcs, Chilli Oil: 0.05 bottle, Fried Garlic: 1 packs', 'SIO-01', 'order', 'MENU_ITEM'],
      ['Siomai Rice Meal', 75.00, 'FAVORITE', 250, 'Siomai: 4 pcs, Rice: 0.2 kg, Chilli Oil: 0.05 bottle, Fried Garlic: 1 packs', 'SIO-02', 'meal', 'MENU_ITEM'],
      ['Double Cheese Fries', 65.00, 'DOUBLE CHEESE FRIES', 180, 'Fries: 0.15 kg, OK Cheese: 1 pcs, Cooking Oil: 0.02 bottle', 'FRS-01', 'serving', 'MENU_ITEM'],
      ['Classic Hotdog Sandwich', 50.00, 'CLASSIC', 100, 'Hotdog: 1 pcs, Hotdog Bread: 1 pcs, Ketchup: 0.01 gal, Mayo: 0.01 gal', 'HTD-01', 'serving', 'MENU_ITEM'],
      ['Tapsilog Special', 110.00, 'FAVORITE', 90, 'Patties: 2 pcs, Rice: 0.2 kg, Egg: 1 pcs', 'SLG-01', 'meal', 'MENU_ITEM'],
      ['Coca-Cola (Mismo)', 25.00, 'DRINKS', 120, 'Soft Drinks: 1 bottle', 'DRK-01', 'bottle', 'MENU_ITEM'],
      ['Mineral Water 500ml', 20.00, 'DRINKS', 60, 'H2O Mineral Water: 1 bottle', 'DRK-02', 'bottle', 'MENU_ITEM'],
      // Raw Ingredients for Commissary & Branch Inventory Tracking
      ['Patties', 14.50, 'MEAT & POULTRY', 150, 'Raw Burger Patty (Commissary Grade)', 'ING-01', 'pcs', 'INGREDIENT'],
      ['Hotdog', 12.00, 'MEAT & POULTRY', 100, 'Tender Juicy Hotdog Link', 'ING-02', 'pcs', 'INGREDIENT'],
      ['Chicken Fillet', 22.00, 'MEAT & POULTRY', 80, 'Breaded Chicken Fillet Cutlet', 'ING-03', 'pcs', 'INGREDIENT'],
      ['Fries', 145.00, 'FROZEN', 45, 'Premium Shoestring French Fries', 'ING-04', 'kg', 'INGREDIENT'],
      ['Shanghai', 6.50, 'DIMSUM', 200, 'Lumpiang Shanghai Roll', 'ING-05', 'pcs', 'INGREDIENT'],
      ['Siomai', 7.00, 'DIMSUM', 350, 'Authentic Pork Siomai Piece', 'ING-06', 'pcs', 'INGREDIENT'],
      ['Patty Bread', 5.50, 'BAKERY', 150, 'Sesame Burger Bun', 'ING-07', 'pcs', 'INGREDIENT'],
      ['Hotdog Bread', 5.50, 'BAKERY', 100, 'Soft Hotdog Bun', 'ING-08', 'pcs', 'INGREDIENT'],
      ['Egg', 8.50, 'DAIRY & EGGS', 120, 'Farm Fresh Large Egg', 'ING-09', 'pcs', 'INGREDIENT'],
      ['OK Cheese', 6.00, 'DAIRY & EGGS', 160, 'Cheddar Cheese Slice', 'ING-11', 'pcs', 'INGREDIENT'],
      ['Rice', 52.00, 'GRAINS', 50, 'Sinandomeng White Rice', 'ING-12', 'kg', 'INGREDIENT'],
      ['Soft Drinks', 15.00, 'BEVERAGES', 120, 'Assorted Mismo Softdrinks', 'ING-13', 'bottle', 'INGREDIENT'],
      ['Chilli Oil', 85.00, 'CONDIMENTS', 15, 'Signature House Chilli Garlic Oil', 'ING-14', 'bottle', 'INGREDIENT'],
      ['Fried Garlic', 65.00, 'CONDIMENTS', 20, 'Crispy Toasted Garlic Bits', 'ING-15', 'packs', 'INGREDIENT'],
      ['H2O Mineral Water', 10.00, 'BEVERAGES', 60, 'Purified Bottled Water 500ml', 'ING-16', 'bottle', 'INGREDIENT']
    ];

    for (var i = 0; i < seedMenuAndInventory.length; i++) {
      menuSheet.appendRow(seedMenuAndInventory[i]);
    }
  }

  // 3. Tab 3: "Sales_Audit" (Daily Remittances, Cashier Name, Cash Variance, Expenses, Branch, Expected Cash, Actual Cash Counted, Status, Timestamp, Notes)
  var auditSheet = ss.getSheetByName(TAB_SALES_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(TAB_SALES_AUDIT);
    var auditHeaders = [
      'Daily Remittances',
      'Cashier Name',
      'Cash Variance',
      'Expenses',
      'Branch',
      'Expected Cash',
      'Actual Cash Counted',
      'Status',
      'Timestamp',
      'Notes'
    ];
    auditSheet.appendRow(auditHeaders);
    styleHeaderRow_(auditSheet, auditHeaders.length);

    // Seed initial remittance audit row
    auditSheet.appendRow([
      5450.00,
      'Angela Reyes (Cashier)',
      0.00,
      0.00,
      'Tagpuan - Narra Branch',
      5450.00,
      5450.00,
      'VERIFIED',
      new Date().toISOString(),
      'Opening shift balanced cash remittance'
    ]);
  }
}

function styleHeaderRow_(sheet, colCount) {
  var range = sheet.getRange(1, 1, 1, colCount);
  range.setBackground('#111111');
  range.setFontColor('#CDEBC5');
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/**
 * Reads any sheet tab into an array of key-value JSON objects based on Row 1 headers
 */
function readTabAsObjects_(sheet, branchFilter) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var results = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = { _rowNumber: r + 1 };
    for (var c = 0; c < headers.length; c++) {
      var key = String(headers[c]).trim();
      obj[key] = row[c];
    }
    if (branchFilter) {
      var rowBranch = String(obj['Branch'] || '').toLowerCase();
      var filterLower = String(branchFilter).toLowerCase();
      if (rowBranch && rowBranch.indexOf(filterLower) === -1) {
        // Also check metadata JSON for branch_id match
        var metaStr = String(obj['Metadata JSON'] || '');
        if (metaStr.indexOf(branchFilter) === -1) {
          continue;
        }
      }
    }
    results.push(obj);
  }
  return results;
}

/**
 * Appends or updates an Order in Tab 1: "Orders_Log"
 * Columns: Order ID | Branch | Items | Amount | Payment Status | Timestamp | Kitchen Status | Source | Customer Name | Metadata JSON
 */
function upsertOrderRow_(sheet, data) {
  var orderId = data.order_number || data.orderId || data['Order ID'] || data.id || ('TAG-' + new Date().getTime());
  var branch = data.branch_name || data.branch || data['Branch'] || 'Tagpuan - Narra Branch';
  var itemsSummary = data.itemsSummary || data['Items'] || formatOrderItemsString_(data.items || []);
  var amount = Number(data.total !== undefined ? data.total : (data.amount !== undefined ? data.amount : (data['Amount'] || 0)));
  var paymentStatus = data.payment_status || data.status || data['Payment Status'] || 'PENDING_PAYMENT';
  var timestamp = data.created_at || data.timestamp || data['Timestamp'] || new Date().toISOString();
  var kitchenStatus = data.kitchen_status || data['Kitchen Status'] || 'NEW';
  var source = data.source || data['Source'] || 'POS';
  var customerName = data.customer_name || data['Customer Name'] || 'Guest';
  var metadataJson = typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data);

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(orderId)) {
        var rowIndex = i + 2;
        sheet.getRange(rowIndex, 1, 1, 10).setValues([[
          orderId,
          branch,
          itemsSummary,
          amount,
          paymentStatus,
          timestamp,
          kitchenStatus,
          source,
          customerName,
          metadataJson
        ]]);
        return { orderId: orderId, updated: true, row: rowIndex };
      }
    }
  }

  sheet.appendRow([
    orderId,
    branch,
    itemsSummary,
    amount,
    paymentStatus,
    timestamp,
    kitchenStatus,
    source,
    customerName,
    metadataJson
  ]);

  return { orderId: orderId, inserted: true, row: sheet.getLastRow() };
}

/**
 * Updates Payment Status or Kitchen Status (KDS) for an existing Order in "Orders_Log"
 */
function updateOrderStatusRow_(sheet, payload) {
  var targetId = payload.order_number || payload.orderId || payload.id;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { found: false, orderId: targetId };

  var rangeValues = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  for (var i = 0; i < rangeValues.length; i++) {
    var rowOrderId = String(rangeValues[i][0]);
    var metaRaw = String(rangeValues[i][9] || '{}');
    if (rowOrderId === String(targetId) || metaRaw.indexOf(String(targetId)) !== -1) {
      var rowNum = i + 2;
      if (payload.payment_status || payload.status) {
        sheet.getRange(rowNum, 5).setValue(payload.payment_status || payload.status);
      }
      if (payload.kitchen_status) {
        sheet.getRange(rowNum, 7).setValue(payload.kitchen_status);
      }
      try {
        var parsedMeta = JSON.parse(metaRaw);
        if (payload.payment_status || payload.status) parsedMeta.status = payload.payment_status || payload.status;
        if (payload.kitchen_status) parsedMeta.kitchen_status = payload.kitchen_status;
        if (payload.payment_method) parsedMeta.payment_method = payload.payment_method;
        sheet.getRange(rowNum, 10).setValue(JSON.stringify(parsedMeta));
      } catch (e) {}
      return { found: true, orderId: rowOrderId, row: rowNum };
    }
  }
  return { found: false, orderId: targetId };
}

/**
 * Upserts a Menu Item or Ingredient Stock row in Tab 2: "Menu_Inventory"
 * Columns: Item Name | Price | Category | Stock Level | Recipe Ingredients | Item Code | Unit | Record Type
 */
function upsertMenuInventoryRow_(sheet, data) {
  var itemName = data['Item Name'] || data.item_name || data.product_name || data.name || 'Unnamed Item';
  var price = Number(data['Price'] !== undefined ? data['Price'] : (data.selling_price !== undefined ? data.selling_price : (data.cost_price || 0)));
  var category = data['Category'] || data.category || 'GENERAL';
  var stockLevel = Number(data['Stock Level'] !== undefined ? data['Stock Level'] : (data.current_stock !== undefined ? data.current_stock : (data.stock !== undefined ? data.stock : 100)));
  var recipeIngredients = data['Recipe Ingredients'] || data.recipe_ingredients || data.description || '';
  var itemCode = data['Item Code'] || data.item_code || data.product_code || data.id || '';
  var unit = data['Unit'] || data.unit || 'pcs';
  var recordType = data['Record Type'] || data.record_type || (data.selling_price !== undefined ? 'MENU_ITEM' : 'INGREDIENT');

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    for (var i = 0; i < rows.length; i++) {
      var existingName = String(rows[i][0]).toLowerCase();
      var existingCode = String(rows[i][5]).toLowerCase();
      if (
        existingName === String(itemName).toLowerCase() ||
        (itemCode && existingCode === String(itemCode).toLowerCase())
      ) {
        var rowIndex = i + 2;
        sheet.getRange(rowIndex, 1, 1, 8).setValues([[
          itemName,
          price,
          category,
          stockLevel,
          recipeIngredients || rows[i][4],
          itemCode || rows[i][5],
          unit || rows[i][6],
          recordType || rows[i][7]
        ]]);
        return { itemName: itemName, stockLevel: stockLevel, updated: true, row: rowIndex };
      }
    }
  }

  sheet.appendRow([
    itemName,
    price,
    category,
    stockLevel,
    recipeIngredients,
    itemCode,
    unit,
    recordType
  ]);

  return { itemName: itemName, stockLevel: stockLevel, inserted: true, row: sheet.getLastRow() };
}

/**
 * Deducts stock levels in "Menu_Inventory" based on ordered items and their Recipe Ingredients
 */
function deductInventoryFromOrder_(sheet, orderItems) {
  if (!sheet || !orderItems || !orderItems.length) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var dataRange = sheet.getRange(2, 1, lastRow - 1, 8);
  var rows = dataRange.getValues();
  var updatedNames = [];

  for (var idx = 0; idx < orderItems.length; idx++) {
    var ordered = orderItems[idx];
    var prodName = String(ordered.product_name || ordered.name || '').toLowerCase();
    var qty = Number(ordered.quantity || 1);

    for (var r = 0; r < rows.length; r++) {
      var rowName = String(rows[r][0]).toLowerCase();
      var currentStock = Number(rows[r][3] || 0);
      var recipeStr = String(rows[r][4] || '');

      if (rowName === prodName || (prodName && rowName.indexOf(prodName) !== -1)) {
        rows[r][3] = Math.max(0, Math.round((currentStock - qty) * 100) / 100);
        updatedNames.push(rows[r][0]);

        // Parse "Ingredient: Qty unit, ..." to deduct raw ingredients as well
        if (recipeStr && recipeStr.indexOf(':') !== -1) {
          var parts = recipeStr.split(',');
          for (var p = 0; p < parts.length; p++) {
            var seg = parts[p].split(':');
            if (seg.length === 2) {
              var ingName = seg[0].trim().toLowerCase();
              var numMatch = seg[1].trim().match(/[\d.]+/);
              var ingQty = numMatch ? parseFloat(numMatch[0]) : 1;
              for (var ir = 0; ir < rows.length; ir++) {
                if (String(rows[ir][0]).toLowerCase() === ingName) {
                  var curIngStock = Number(rows[ir][3] || 0);
                  rows[ir][3] = Math.max(0, Math.round((curIngStock - (ingQty * qty)) * 100) / 100);
                }
              }
            }
          }
        }
      }
    }
  }

  dataRange.setValues(rows);
  return updatedNames;
}

/**
 * Appends a row in Tab 3: "Sales_Audit"
 * Columns: Daily Remittances | Cashier Name | Cash Variance | Expenses | Branch | Expected Cash | Actual Cash Counted | Status | Timestamp | Notes
 */
function appendSalesAuditRow_(sheet, data) {
  var dailyRemittance = Number(
    data['Daily Remittances'] !== undefined
      ? data['Daily Remittances']
      : (data.remitted_amount !== undefined ? data.remitted_amount : (data.daily_remittance || 0))
  );
  var cashierName = data['Cashier Name'] || data.cashier_name || 'Cashier';
  var cashVariance = Number(
    data['Cash Variance'] !== undefined
      ? data['Cash Variance']
      : (data.variance !== undefined ? data.variance : (data.cash_variance || 0))
  );
  var expenses = Number(
    data['Expenses'] !== undefined
      ? data['Expenses']
      : (data.total_expenses !== undefined ? data.total_expenses : (data.expenses || 0))
  );
  var branch = data['Branch'] || data.branch_name || 'Tagpuan - Narra Branch';
  var expectedCash = Number(data.expected_cash !== undefined ? data.expected_cash : dailyRemittance);
  var actualCash = Number(data.actual_cash_counted !== undefined ? data.actual_cash_counted : dailyRemittance);
  var status = data.status || 'SUBMITTED';
  var timestamp = data.created_at || data.timestamp || new Date().toISOString();
  var notes = data.notes || '';

  sheet.appendRow([
    dailyRemittance,
    cashierName,
    cashVariance,
    expenses,
    branch,
    expectedCash,
    actualCash,
    status,
    timestamp,
    notes
  ]);

  return {
    dailyRemittance: dailyRemittance,
    cashierName: cashierName,
    cashVariance: cashVariance,
    expenses: expenses,
    branch: branch,
    row: sheet.getLastRow()
  };
}

/**
 * Saves a generated PDF (either from base64 PDF bytes or HTML content) directly into a designated Google Drive folder
 */
function savePdfToDriveFolder_(data) {
  var folderId = data.folderId || '';
  var folderName = data.folderName || DEFAULT_DRIVE_FOLDER_NAME;
  var fileName = data.fileName || ('Tagpuan_Document_' + new Date().getTime() + '.pdf');
  if (fileName.toLowerCase().slice(-4) !== '.pdf') {
    fileName += '.pdf';
  }

  var folder;
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      folder = getOrCreateDriveFolder_(folderName);
    }
  } else {
    folder = getOrCreateDriveFolder_(folderName);
  }

  // Create sub-folder by document category ('e-Receipts' or 'Sales_Summaries') if specified
  if (data.subFolder) {
    var subIter = folder.getFoldersByName(data.subFolder);
    folder = subIter.hasNext() ? subIter.next() : folder.createFolder(data.subFolder);
  }

  var pdfBlob;
  if (data.base64Pdf) {
    var cleanBase64 = String(data.base64Pdf).replace(/^data:application\/pdf;base64,/, '');
    var decoded = Utilities.base64Decode(cleanBase64);
    pdfBlob = Utilities.newBlob(decoded, MimeType.PDF, fileName);
  } else {
    var htmlContent = data.htmlContent || '<h1>Tagpuan ERP Document</h1>';
    var htmlOutput = HtmlService.createHtmlOutput(htmlContent);
    pdfBlob = htmlOutput.getAs(MimeType.PDF).setName(fileName);
  }

  var file = folder.createFile(pdfBlob);
  return {
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
    createdAt: new Date().toISOString()
  };
}

function getOrCreateDriveFolder_(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function formatOrderItemsString_(items) {
  if (!items || !items.length) return '';
  var parts = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var qty = it.quantity || 1;
    var name = it.product_name || it.name || 'Item';
    parts.push(qty + 'x ' + name);
  }
  return parts.join(', ');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
