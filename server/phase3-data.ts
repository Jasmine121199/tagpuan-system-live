import {
  Product,
  ProductCategory,
  Ingredient,
  Recipe,
  RecipeItem,
  ExtractionCode
} from '../src/types/index';

// EXACT PRODUCT CATEGORIES FROM SECTION 3
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'BURGERS',
  'DOUBLE CHEESE FRIES',
  'FAVORITE',
  'CLASSIC',
  'SPECIALTY',
  'DRINKS',
  'ADD ONS'
];

// EXACT INITIAL INGREDIENTS FROM SECTION 5
export interface InitialIngredientSeed {
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  cost_price: number;
  reorder_level: number;
  maximum_stock: number;
  initial_stock: number;
}

export const INITIAL_INGREDIENTS_DATA: InitialIngredientSeed[] = [
  { item_code: 'ING-01', item_name: 'Patties', category: 'MEAT', unit: 'pcs', cost_price: 8.50, reorder_level: 50, maximum_stock: 300, initial_stock: 120 },
  { item_code: 'ING-02', item_name: 'Hotdog', category: 'MEAT', unit: 'pcs', cost_price: 7.00, reorder_level: 30, maximum_stock: 200, initial_stock: 80 },
  { item_code: 'ING-03', item_name: 'Chicken Fillet', category: 'MEAT', unit: 'pcs', cost_price: 15.00, reorder_level: 20, maximum_stock: 100, initial_stock: 45 },
  { item_code: 'ING-04', item_name: 'Fries', category: 'FROZEN', unit: 'kg', cost_price: 110.00, reorder_level: 10.0, maximum_stock: 50.0, initial_stock: 25.0 },
  { item_code: 'ING-05', item_name: 'Shanghai', category: 'MEAT', unit: 'pcs', cost_price: 2.20, reorder_level: 60, maximum_stock: 400, initial_stock: 150 },
  { item_code: 'ING-06', item_name: 'Siomai', category: 'MEAT', unit: 'pcs', cost_price: 2.00, reorder_level: 80, maximum_stock: 500, initial_stock: 200 },
  { item_code: 'ING-07', item_name: 'Patty Bread', category: 'BREAD', unit: 'pcs', cost_price: 3.50, reorder_level: 50, maximum_stock: 300, initial_stock: 120 },
  { item_code: 'ING-08', item_name: 'Hotdog Bread', category: 'BREAD', unit: 'pcs', cost_price: 3.50, reorder_level: 30, maximum_stock: 200, initial_stock: 75 },
  { item_code: 'ING-09', item_name: 'Egg', category: 'POULTRY', unit: 'pcs', cost_price: 6.50, reorder_level: 40, maximum_stock: 300, initial_stock: 100 },
  { item_code: 'ING-10', item_name: 'Meatloaf', category: 'MEAT', unit: 'pcs', cost_price: 4.00, reorder_level: 40, maximum_stock: 250, initial_stock: 90 },
  { item_code: 'ING-11', item_name: 'OK Cheese', category: 'DAIRY', unit: 'pcs', cost_price: 2.50, reorder_level: 50, maximum_stock: 300, initial_stock: 130 },
  { item_code: 'ING-12', item_name: 'Rice', category: 'DRY_GOODS', unit: 'kg', cost_price: 48.00, reorder_level: 15.0, maximum_stock: 100.0, initial_stock: 40.0 },
  { item_code: 'ING-13', item_name: 'Soft Drinks', category: 'BEVERAGE', unit: 'bottle', cost_price: 6.00, reorder_level: 40, maximum_stock: 250, initial_stock: 110 },
  { item_code: 'ING-14', item_name: 'Chilli Oil', category: 'CONDIMENT', unit: 'bottle', cost_price: 45.00, reorder_level: 3, maximum_stock: 20, initial_stock: 8 },
  { item_code: 'ING-15', item_name: 'Fried Garlic', category: 'CONDIMENT', unit: 'packs', cost_price: 35.00, reorder_level: 4, maximum_stock: 30, initial_stock: 12 },
  { item_code: 'ING-16', item_name: 'H2O', category: 'BEVERAGE', unit: 'bottle', cost_price: 4.00, reorder_level: 20, maximum_stock: 100, initial_stock: 40 },
  { item_code: 'ING-17', item_name: 'Hot Sauce', category: 'CONDIMENT', unit: 'bottle', cost_price: 38.00, reorder_level: 4, maximum_stock: 25, initial_stock: 10 },
  { item_code: 'ING-18', item_name: 'Ketchup', category: 'CONDIMENT', unit: 'gal', cost_price: 180.00, reorder_level: 2.0, maximum_stock: 15.0, initial_stock: 6.0 },
  { item_code: 'ING-19', item_name: 'Mayo', category: 'CONDIMENT', unit: 'gal', cost_price: 220.00, reorder_level: 2.0, maximum_stock: 15.0, initial_stock: 5.5 },
  { item_code: 'ING-20', item_name: 'Oil', category: 'COOKING', unit: 'bottle', cost_price: 65.00, reorder_level: 5, maximum_stock: 30, initial_stock: 14 },
  { item_code: 'ING-21', item_name: 'Toyomansi Sachet', category: 'CONDIMENT', unit: 'sachet', cost_price: 0.80, reorder_level: 100, maximum_stock: 600, initial_stock: 250 },
  { item_code: 'ING-22', item_name: 'Toyomansi Bottle', category: 'CONDIMENT', unit: 'bottle', cost_price: 32.00, reorder_level: 4, maximum_stock: 20, initial_stock: 9 },
  { item_code: 'ING-23', item_name: 'Vinegar', category: 'CONDIMENT', unit: 'bottle', cost_price: 28.00, reorder_level: 4, maximum_stock: 20, initial_stock: 8 },
  { item_code: 'ING-24', item_name: 'BBQ', category: 'SEASONING', unit: 'packs', cost_price: 55.00, reorder_level: 4, maximum_stock: 25, initial_stock: 10 },
  { item_code: 'ING-25', item_name: 'Cheese Powder', category: 'SEASONING', unit: 'packs', cost_price: 60.00, reorder_level: 5, maximum_stock: 30, initial_stock: 12 },
  { item_code: 'ING-26', item_name: 'Cheese Sauce Powder', category: 'SEASONING', unit: 'packs', cost_price: 75.00, reorder_level: 4, maximum_stock: 25, initial_stock: 8 },
  { item_code: 'ING-27', item_name: 'Gravy Powder', category: 'SEASONING', unit: 'packs', cost_price: 45.00, reorder_level: 4, maximum_stock: 25, initial_stock: 11 },
  { item_code: 'ING-28', item_name: 'RIT', category: 'BEVERAGE', unit: 'packs', cost_price: 25.00, reorder_level: 10, maximum_stock: 50, initial_stock: 22 },
  { item_code: 'ING-29', item_name: 'Sour Cream', category: 'SEASONING', unit: 'packs', cost_price: 65.00, reorder_level: 4, maximum_stock: 25, initial_stock: 9 },
  { item_code: 'ING-30', item_name: '1 oz', category: 'PACKAGING', unit: 'pcs', cost_price: 0.40, reorder_level: 100, maximum_stock: 500, initial_stock: 200 },
  { item_code: 'ING-31', item_name: '10 oz', category: 'PACKAGING', unit: 'pcs', cost_price: 0.85, reorder_level: 100, maximum_stock: 600, initial_stock: 240 },
  { item_code: 'ING-32', item_name: 'Counter Bag', category: 'PACKAGING', unit: 'pcs', cost_price: 0.50, reorder_level: 150, maximum_stock: 800, initial_stock: 350 },
  { item_code: 'ING-33', item_name: 'F-large', category: 'PACKAGING', unit: 'pcs', cost_price: 1.80, reorder_level: 50, maximum_stock: 300, initial_stock: 120 },
  { item_code: 'ING-34', item_name: 'F-med', category: 'PACKAGING', unit: 'pcs', cost_price: 1.40, reorder_level: 60, maximum_stock: 350, initial_stock: 140 },
  { item_code: 'ING-35', item_name: 'F-small 220cc', category: 'PACKAGING', unit: 'pcs', cost_price: 1.00, reorder_level: 70, maximum_stock: 400, initial_stock: 160 },
  { item_code: 'ING-36', item_name: 'Ice Bag', category: 'PACKAGING', unit: 'packs', cost_price: 12.00, reorder_level: 10, maximum_stock: 50, initial_stock: 25 },
  { item_code: 'ING-37', item_name: 'Igloo Coolers', category: 'EQUIPMENT', unit: 'pcs', cost_price: 450.00, reorder_level: 1, maximum_stock: 5, initial_stock: 2 },
  { item_code: 'ING-38', item_name: 'Mini', category: 'PACKAGING', unit: 'pcs', cost_price: 0.60, reorder_level: 100, maximum_stock: 500, initial_stock: 180 },
  { item_code: 'ING-39', item_name: 'Plastic Labo', category: 'PACKAGING', unit: 'packs', cost_price: 18.00, reorder_level: 15, maximum_stock: 60, initial_stock: 30 },
  { item_code: 'ING-40', item_name: 'PM Box', category: 'PACKAGING', unit: 'pcs', cost_price: 2.20, reorder_level: 80, maximum_stock: 400, initial_stock: 160 },
  { item_code: 'ING-41', item_name: 'SS Rice Bowl', category: 'PACKAGING', unit: 'pcs', cost_price: 2.50, reorder_level: 100, maximum_stock: 600, initial_stock: 220 },
  { item_code: 'ING-42', item_name: 'Spoon', category: 'PACKAGING', unit: 'pcs', cost_price: 0.35, reorder_level: 150, maximum_stock: 800, initial_stock: 300 },
  { item_code: 'ING-43', item_name: 'Straw', category: 'PACKAGING', unit: 'pcs', cost_price: 0.15, reorder_level: 200, maximum_stock: 1000, initial_stock: 400 },
  { item_code: 'ING-44', item_name: 'Tape', category: 'PACKAGING', unit: 'roll', cost_price: 22.00, reorder_level: 3, maximum_stock: 20, initial_stock: 8 },
  { item_code: 'ING-45', item_name: 'Tiny', category: 'PACKAGING', unit: 'pcs', cost_price: 0.30, reorder_level: 100, maximum_stock: 500, initial_stock: 190 },
  { item_code: 'ING-46', item_name: 'Tissue', category: 'SUPPLIES', unit: 'packs', cost_price: 15.00, reorder_level: 20, maximum_stock: 100, initial_stock: 45 },
  { item_code: 'ING-47', item_name: 'Tooth Pick', category: 'SUPPLIES', unit: 'packs', cost_price: 10.00, reorder_level: 10, maximum_stock: 50, initial_stock: 20 },
  { item_code: 'ING-48', item_name: 'Dishwashing Liquid', category: 'SUPPLIES', unit: 'bottle', cost_price: 42.00, reorder_level: 3, maximum_stock: 15, initial_stock: 6 },
  { item_code: 'ING-49', item_name: 'Hotdog Packaging', category: 'PACKAGING', unit: 'pcs', cost_price: 0.60, reorder_level: 100, maximum_stock: 500, initial_stock: 200 },
  { item_code: 'ING-50', item_name: 'Hotdog Pouch', category: 'PACKAGING', unit: 'pcs', cost_price: 0.50, reorder_level: 100, maximum_stock: 500, initial_stock: 180 }
];

// EXACT INITIAL PRODUCTS & PRICES FROM SECTION 4
export interface InitialProductSeed {
  product_code: string;
  product_name: string;
  category: ProductCategory;
  description: string;
  selling_price: number;
  recipe_components: {
    ingredient_name: string;
    quantity: number;
    unit: string;
    code?: ExtractionCode;
  }[];
}

export const INITIAL_PRODUCTS_DATA: InitialProductSeed[] = [
  // --- PRODUCTION SIGNATURE ANCHOR PRODUCTS ---
  {
    product_code: 'BUR-00',
    product_name: 'Tagpuan Burger',
    category: 'BURGERS',
    description: 'The iconic Tagpuan signature burger: grilled beef patty, toasted burger bun, and melted cheese slice.',
    selling_price: 35,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'OK Cheese', quantity: 1, unit: 'pcs', code: 'C' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FAV-00',
    product_name: 'Siomai Rice Meal',
    category: 'FAVORITE',
    description: 'Tagpuan bestselling meal: 4 pieces steamed savory pork siomai served over hot rice cup portion with toyomansi.',
    selling_price: 45,
    recipe_components: [
      { ingredient_name: 'Siomai', quantity: 4, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'Toyomansi Sachet', quantity: 1, unit: 'sachet' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'HD-01',
    product_name: 'Jumbo Hotdog',
    category: 'CLASSIC',
    description: 'Juicy jumbo grilled hotdog sandwich in warm toasted hotdog bun with special dressing.',
    selling_price: 35,
    recipe_components: [
      { ingredient_name: 'Hotdog', quantity: 1, unit: 'pcs', code: 'HD' },
      { ingredient_name: 'Hotdog Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'Hot Sauce', quantity: 0.01, unit: 'bottle' },
      { ingredient_name: 'Hotdog Packaging', quantity: 1, unit: 'pcs' }
    ]
  },
  // --- BURGERS ---
  {
    product_code: 'BUR-01',
    product_name: 'Plain Burger',
    category: 'BURGERS',
    description: 'Tagpuan classic beef patty grilled on toasted sesame bun with our signature sauce.',
    selling_price: 16,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-02',
    product_name: 'Burger with Softdrinks',
    category: 'BURGERS',
    description: 'Signature classic burger paired with a refreshing ice-cold soft drink.',
    selling_price: 26,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'Soft Drinks', quantity: 1, unit: 'bottle', code: 'SD' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' },
      { ingredient_name: '10 oz', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Straw', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-03',
    product_name: 'Cheese Burger',
    category: 'BURGERS',
    description: 'Grilled patty topped with melted OK cheese slice in toasted bun.',
    selling_price: 21,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'OK Cheese', quantity: 1, unit: 'pcs', code: 'C' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-04',
    product_name: 'Burger Overload',
    category: 'BURGERS',
    description: 'Loaded burger with grilled patty, fried egg, cheese, and double sauce.',
    selling_price: 42,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'OK Cheese', quantity: 1, unit: 'pcs', code: 'C' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-05',
    product_name: 'Buy 1 Take 1 Cheese Burger with Softdrinks',
    category: 'BURGERS',
    description: 'Two loaded cheeseburgers plus a refreshing soft drink combo.',
    selling_price: 50,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 2, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 2, unit: 'pcs', code: 'B' },
      { ingredient_name: 'OK Cheese', quantity: 2, unit: 'pcs', code: 'C' },
      { ingredient_name: 'Soft Drinks', quantity: 1, unit: 'bottle', code: 'SD' },
      { ingredient_name: 'Ketchup', quantity: 0.02, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.02, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 2, unit: 'pcs' },
      { ingredient_name: '10 oz', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Straw', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-06',
    product_name: 'Cheese Overload',
    category: 'BURGERS',
    description: 'Double cheese portion with savory patty and egg in fresh bun.',
    selling_price: 48,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'OK Cheese', quantity: 2, unit: 'pcs', code: 'C' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-07',
    product_name: 'Cheese Burger with Fries',
    category: 'BURGERS',
    description: 'Cheeseburger served alongside golden double-cheese spiced fries.',
    selling_price: 43,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Patty Bread', quantity: 1, unit: 'pcs', code: 'B' },
      { ingredient_name: 'OK Cheese', quantity: 1, unit: 'pcs', code: 'C' },
      { ingredient_name: 'Fries', quantity: 0.10, unit: 'kg' },
      { ingredient_name: 'Cheese Powder', quantity: 0.05, unit: 'packs' },
      { ingredient_name: 'Ketchup', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Mayo', quantity: 0.01, unit: 'gal' },
      { ingredient_name: 'Counter Bag', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'F-med', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'BUR-08',
    product_name: 'Buy 1 Take 1 Classic Hotdog Sandwich with Softdrinks',
    category: 'BURGERS',
    description: 'Two juicy hotdog sandwiches with dressing plus soft drinks.',
    selling_price: 59,
    recipe_components: [
      { ingredient_name: 'Hotdog', quantity: 2, unit: 'pcs', code: 'HD' },
      { ingredient_name: 'Hotdog Bread', quantity: 2, unit: 'pcs', code: 'B' },
      { ingredient_name: 'Soft Drinks', quantity: 1, unit: 'bottle', code: 'SD' },
      { ingredient_name: 'Hot Sauce', quantity: 0.01, unit: 'bottle' },
      { ingredient_name: 'Hotdog Packaging', quantity: 2, unit: 'pcs' },
      { ingredient_name: '10 oz', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Straw', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- DOUBLE CHEESE FRIES ---
  {
    product_code: 'FRY-01',
    product_name: 'Small',
    category: 'DOUBLE CHEESE FRIES',
    description: 'Crispy golden fries tossed in savory cheese powder seasoning.',
    selling_price: 22,
    recipe_components: [
      { ingredient_name: 'Fries', quantity: 0.10, unit: 'kg' },
      { ingredient_name: 'Cheese Powder', quantity: 0.05, unit: 'packs' },
      { ingredient_name: 'F-small 220cc', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FRY-02',
    product_name: 'Medium',
    category: 'DOUBLE CHEESE FRIES',
    description: 'Medium serving of crisp fries seasoned with rich cheese powder.',
    selling_price: 42,
    recipe_components: [
      { ingredient_name: 'Fries', quantity: 0.20, unit: 'kg' },
      { ingredient_name: 'Cheese Powder', quantity: 0.10, unit: 'packs' },
      { ingredient_name: 'F-med', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FRY-03',
    product_name: 'Large',
    category: 'DOUBLE CHEESE FRIES',
    description: 'Large shareable tub of freshly fried double cheese seasoned fries.',
    selling_price: 60,
    recipe_components: [
      { ingredient_name: 'Fries', quantity: 0.35, unit: 'kg' },
      { ingredient_name: 'Cheese Powder', quantity: 0.15, unit: 'packs' },
      { ingredient_name: 'F-large', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- DIMSUM & FAVORITE VIANDS ---
  {
    product_code: 'FAV-00A',
    product_name: 'Pork Siomai (4 pcs)',
    category: 'FAVORITE',
    description: 'Steamed savory pork dimsum served with chili garlic sauce and calamansi.',
    selling_price: 40,
    recipe_components: [
      { ingredient_name: 'Siomai', quantity: 4, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Toyomansi Sachet', quantity: 1, unit: 'sachet' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FAV-00B',
    product_name: 'Siomai Rice with Egg',
    category: 'FAVORITE',
    description: '4 pieces steamed pork siomai, sunny-side fried egg, garlic rice and toyomansi.',
    selling_price: 50,
    recipe_components: [
      { ingredient_name: 'Siomai', quantity: 4, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'Toyomansi Sachet', quantity: 1, unit: 'sachet' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- FAVORITE RICE MEALS ---
  {
    product_code: 'FAV-01',
    product_name: 'F1 Siomai Rice',
    category: 'FAVORITE',
    description: '3 pieces steamed pork siomai served over hot garlic rice.',
    selling_price: 25,
    recipe_components: [
      { ingredient_name: 'Siomai', quantity: 3, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'Toyomansi Sachet', quantity: 1, unit: 'sachet' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FAV-02',
    product_name: 'F2 Egg Rice',
    category: 'FAVORITE',
    description: 'Sunny-side fried egg served over steamed hot rice with fried garlic.',
    selling_price: 25,
    recipe_components: [
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FAV-03',
    product_name: 'F3 Shanghai Rice',
    category: 'FAVORITE',
    description: '3 pieces crispy lumpiang shanghai served with steaming rice.',
    selling_price: 25,
    recipe_components: [
      { ingredient_name: 'Shanghai', quantity: 3, unit: 'pcs', code: 'Sha' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'FAV-04',
    product_name: 'F4 Patty Rice',
    category: 'FAVORITE',
    description: 'Savory burger steak patty served over hot rice with warm gravy.',
    selling_price: 25,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'Gravy Powder', quantity: 0.05, unit: 'packs' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- CLASSIC RICE MEALS ---
  {
    product_code: 'CLA-01',
    product_name: 'C1 Shanghai, Siomai, Egg, & Rice',
    category: 'CLASSIC',
    description: 'Crisp shanghai, steamed siomai, fried egg, and steamed rice.',
    selling_price: 45,
    recipe_components: [
      { ingredient_name: 'Shanghai', quantity: 2, unit: 'pcs', code: 'Sha' },
      { ingredient_name: 'Siomai', quantity: 2, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'CLA-02',
    product_name: 'C2 Siomai, Meatloaf, Egg, & Rice',
    category: 'CLASSIC',
    description: 'Pork siomai, seared meatloaf, sunny egg, and warm rice.',
    selling_price: 45,
    recipe_components: [
      { ingredient_name: 'Siomai', quantity: 2, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'CLA-03',
    product_name: 'C3 Patty, Meatloaf, Egg, & Rice',
    category: 'CLASSIC',
    description: 'Grilled beef patty, seared meatloaf, egg, and warm rice with gravy.',
    selling_price: 45,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'Gravy Powder', quantity: 0.05, unit: 'packs' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'CLA-04',
    product_name: 'C4 Shanghai, Meatloaf, Egg, & Rice',
    category: 'CLASSIC',
    description: 'Crispy shanghai rolls, savory meatloaf slice, egg, and rice.',
    selling_price: 45,
    recipe_components: [
      { ingredient_name: 'Shanghai', quantity: 2, unit: 'pcs', code: 'Sha' },
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- SPECIALTY RICE MEALS ---
  {
    product_code: 'SPE-01',
    product_name: 'S1 Shanghai, Siomai, Egg, Meatloaf & Rice',
    category: 'SPECIALTY',
    description: 'Full feast of shanghai, siomai, egg, meatloaf and extra rice.',
    selling_price: 55,
    recipe_components: [
      { ingredient_name: 'Shanghai', quantity: 2, unit: 'pcs', code: 'Sha' },
      { ingredient_name: 'Siomai', quantity: 2, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' },
      { ingredient_name: 'Rice', quantity: 0.20, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'SPE-02',
    product_name: 'S2 Patty, Siomai, Egg, Meatloaf & Rice',
    category: 'SPECIALTY',
    description: 'Grilled patty, pork siomai, sunny egg, meatloaf and rice.',
    selling_price: 55,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Siomai', quantity: 2, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' },
      { ingredient_name: 'Rice', quantity: 0.20, unit: 'kg', code: 'R' },
      { ingredient_name: 'Gravy Powder', quantity: 0.05, unit: 'packs' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'SPE-03',
    product_name: 'S3 Patty, Shanghai, Egg, Siomai & Rice',
    category: 'SPECIALTY',
    description: 'Grilled patty, crispy shanghai, fried egg, siomai, and rice.',
    selling_price: 55,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' },
      { ingredient_name: 'Shanghai', quantity: 2, unit: 'pcs', code: 'Sha' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Siomai', quantity: 2, unit: 'pcs', code: 'Sio' },
      { ingredient_name: 'Rice', quantity: 0.20, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'SPE-04',
    product_name: 'S4 Hotdog, Shanghai, Egg, Meatloaf & Rice',
    category: 'SPECIALTY',
    description: 'Juicy hotdog, crispy shanghai, sunny egg, meatloaf and rice.',
    selling_price: 55,
    recipe_components: [
      { ingredient_name: 'Hotdog', quantity: 1, unit: 'pcs', code: 'HD' },
      { ingredient_name: 'Shanghai', quantity: 2, unit: 'pcs', code: 'Sha' },
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' },
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' },
      { ingredient_name: 'Rice', quantity: 0.20, unit: 'kg', code: 'R' },
      { ingredient_name: 'SS Rice Bowl', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Spoon', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- DRINKS ---
  {
    product_code: 'DRK-01',
    product_name: 'Red Ice Tea',
    category: 'DRINKS',
    description: 'Cold and sweet Tagpuan house-blend red iced tea.',
    selling_price: 5,
    recipe_components: [
      { ingredient_name: 'RIT', quantity: 0.05, unit: 'packs' },
      { ingredient_name: '10 oz', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Straw', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'DRK-02',
    product_name: 'Softdrinks',
    category: 'DRINKS',
    description: 'Refreshing carbonated soft beverage served cold with ice.',
    selling_price: 10,
    recipe_components: [
      { ingredient_name: 'Soft Drinks', quantity: 1, unit: 'bottle', code: 'SD' },
      { ingredient_name: '10 oz', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Straw', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    product_code: 'DRK-03',
    product_name: 'Coffee',
    category: 'DRINKS',
    description: 'Aromatic warm brewed Tagpuan coffee blend.',
    selling_price: 12,
    recipe_components: [
      { ingredient_name: '10 oz', quantity: 1, unit: 'pcs' },
      { ingredient_name: 'Straw', quantity: 1, unit: 'pcs' }
    ]
  },

  // --- ADD ONS ---
  {
    product_code: 'ADD-01',
    product_name: 'Siomai',
    category: 'ADD ONS',
    description: 'Extra single piece steamed pork siomai.',
    selling_price: 5,
    recipe_components: [
      { ingredient_name: 'Siomai', quantity: 1, unit: 'pcs', code: 'Sio' }
    ]
  },
  {
    product_code: 'ADD-02',
    product_name: 'Patty',
    category: 'ADD ONS',
    description: 'Extra grilled beef burger patty.',
    selling_price: 15,
    recipe_components: [
      { ingredient_name: 'Patties', quantity: 1, unit: 'pcs', code: 'P' }
    ]
  },
  {
    product_code: 'ADD-03',
    product_name: 'Egg',
    category: 'ADD ONS',
    description: 'Extra fresh cooked egg.',
    selling_price: 10,
    recipe_components: [
      { ingredient_name: 'Egg', quantity: 1, unit: 'pcs', code: 'E' }
    ]
  },
  {
    product_code: 'ADD-04',
    product_name: 'Cheese',
    category: 'ADD ONS',
    description: 'Extra slice of OK cheese.',
    selling_price: 5,
    recipe_components: [
      { ingredient_name: 'OK Cheese', quantity: 1, unit: 'pcs', code: 'C' }
    ]
  },
  {
    product_code: 'ADD-05',
    product_name: 'Shanghai',
    category: 'ADD ONS',
    description: 'Extra single piece golden fried shanghai roll.',
    selling_price: 5,
    recipe_components: [
      { ingredient_name: 'Shanghai', quantity: 1, unit: 'pcs', code: 'Sha' }
    ]
  },
  {
    product_code: 'ADD-06',
    product_name: 'Meatloaf',
    category: 'ADD ONS',
    description: 'Extra single slice seared meatloaf.',
    selling_price: 10,
    recipe_components: [
      { ingredient_name: 'Meatloaf', quantity: 1, unit: 'pcs', code: 'ML' }
    ]
  },
  {
    product_code: 'ADD-07',
    product_name: 'Hotdog',
    category: 'ADD ONS',
    description: 'Extra single piece grilled hotdog.',
    selling_price: 15,
    recipe_components: [
      { ingredient_name: 'Hotdog', quantity: 1, unit: 'pcs', code: 'HD' }
    ]
  },
  {
    product_code: 'ADD-08',
    product_name: 'Rice',
    category: 'ADD ONS',
    description: 'Extra scoop of steamed rice.',
    selling_price: 10,
    recipe_components: [
      { ingredient_name: 'Rice', quantity: 0.15, unit: 'kg', code: 'R' }
    ]
  }
];
