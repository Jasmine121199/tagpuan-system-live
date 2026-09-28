import {
  ModifierGroup,
  PaymentConfiguration
} from '../src/types/index';

export const INITIAL_MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: 'mod-group-fries-flavor',
    name: 'Fries Flavor',
    type: 'FRIES_FLAVOR',
    min_selection: 0,
    max_selection: 1,
    required: false,
    applicable_categories: ['DOUBLE CHEESE FRIES', 'ADD ONS'],
    options: [
      { id: 'opt-cheese', name: 'Cheese', group: 'FRIES_FLAVOR', price: 0, is_default: true },
      { id: 'opt-bbq', name: 'BBQ', group: 'FRIES_FLAVOR', price: 0 },
      { id: 'opt-sour-cream', name: 'Sour Cream', group: 'FRIES_FLAVOR', price: 0 },
      { id: 'opt-salt-only', name: 'Salt Only', group: 'FRIES_FLAVOR', price: 0 },
      { id: 'opt-plain', name: 'Plain', group: 'FRIES_FLAVOR', price: 0 },
      { id: 'opt-mayo-ketchup', name: 'Mayo Ketchup', group: 'FRIES_FLAVOR', price: 0 }
    ]
  },
  {
    id: 'mod-group-burger-custom',
    name: 'Burger Customization',
    type: 'BURGER_CUSTOMIZATION',
    min_selection: 0,
    max_selection: 5,
    required: false,
    applicable_categories: ['BURGERS', 'SPECIALTY'],
    options: [
      { id: 'opt-b-spicy', name: 'Spicy', group: 'BURGER_CUSTOMIZATION', price: 0 },
      { id: 'opt-b-no-spicy', name: 'No Spicy', group: 'BURGER_CUSTOMIZATION', price: 0 },
      { id: 'opt-b-no-ketchup', name: 'No Ketchup', group: 'BURGER_CUSTOMIZATION', price: 0 },
      { id: 'opt-b-no-mayo', name: 'No Mayonnaise', group: 'BURGER_CUSTOMIZATION', price: 0 },
      { id: 'opt-b-takeout', name: 'Take Out', group: 'BURGER_CUSTOMIZATION', price: 0 }
    ]
  },
  {
    id: 'mod-group-condiments',
    name: 'Condiments & Dips',
    type: 'CONDIMENTS',
    min_selection: 0,
    max_selection: 5,
    required: false,
    applicable_categories: ['BURGERS', 'FAVORITE', 'CLASSIC', 'SPECIALTY', 'DOUBLE CHEESE FRIES'],
    options: [
      { id: 'opt-cond-hotsauce', name: 'With Hot Sauce', group: 'CONDIMENTS', price: 0 },
      { id: 'opt-cond-gravy', name: 'Add Gravy', group: 'CONDIMENTS', price: 15 },
      { id: 'opt-cond-nodressing', name: 'No Dressing', group: 'CONDIMENTS', price: 0 },
      { id: 'opt-cond-nomayo', name: 'No Mayo', group: 'CONDIMENTS', price: 0 },
      { id: 'opt-cond-noketchup', name: 'No Ketchup', group: 'CONDIMENTS', price: 0 }
    ]
  },
  {
    id: 'mod-group-mix-match',
    name: 'Mix & Match Selections (Choose up to 3)',
    type: 'MIX_MATCH',
    min_selection: 1,
    max_selection: 3,
    required: false,
    applicable_categories: ['FAVORITE', 'CLASSIC', 'SPECIALTY'],
    options: [
      { id: 'opt-mm-patty', name: 'Patty', group: 'MIX_MATCH', price: 0 },
      { id: 'opt-mm-egg', name: 'Egg', group: 'MIX_MATCH', price: 0 },
      { id: 'opt-mm-siomai', name: 'Siomai', group: 'MIX_MATCH', price: 0 },
      { id: 'opt-mm-shanghai', name: 'Shanghai', group: 'MIX_MATCH', price: 0 },
      { id: 'opt-mm-meatloaf', name: 'Meatloaf', group: 'MIX_MATCH', price: 0 },
      { id: 'opt-mm-hotdog', name: 'Hotdog', group: 'MIX_MATCH', price: 0 }
    ]
  },
  {
    id: 'mod-group-spec-mix-match',
    name: 'Specialty Mix & Match (Choose 4)',
    type: 'SPECIALTY_MIX_MATCH',
    min_selection: 1,
    max_selection: 4,
    required: false,
    applicable_categories: ['SPECIALTY'],
    options: [
      { id: 'opt-smm-patty', name: 'Patty', group: 'SPECIALTY_MIX_MATCH', price: 0 },
      { id: 'opt-smm-egg', name: 'Egg', group: 'SPECIALTY_MIX_MATCH', price: 0 },
      { id: 'opt-smm-siomai', name: 'Siomai', group: 'SPECIALTY_MIX_MATCH', price: 0 },
      { id: 'opt-smm-shanghai', name: 'Shanghai', group: 'SPECIALTY_MIX_MATCH', price: 0 },
      { id: 'opt-smm-meatloaf', name: 'Meatloaf', group: 'SPECIALTY_MIX_MATCH', price: 0 },
      { id: 'opt-smm-hotdog', name: 'Hotdog', group: 'SPECIALTY_MIX_MATCH', price: 0 }
    ]
  },
  {
    id: 'mod-group-b1t1',
    name: 'Buy 1 Take 1 Customization',
    type: 'B1T1_CUSTOMIZATION',
    min_selection: 0,
    max_selection: 4,
    required: false,
    applicable_categories: ['BURGERS', 'SPECIALTY'],
    options: [
      { id: 'opt-b1t1-spicy', name: 'Spicy', group: 'B1T1_CUSTOMIZATION', price: 0 },
      { id: 'opt-b1t1-both-spicy', name: 'Both Items Spicy', group: 'B1T1_CUSTOMIZATION', price: 0 },
      { id: 'opt-b1t1-no-spicy', name: 'No Spicy', group: 'B1T1_CUSTOMIZATION', price: 0 },
      { id: 'opt-b1t1-no-ketchup', name: 'No Ketchup', group: 'B1T1_CUSTOMIZATION', price: 0 },
      { id: 'opt-b1t1-no-mayo', name: 'No Mayonnaise', group: 'B1T1_CUSTOMIZATION', price: 0 },
      { id: 'opt-b1t1-takeout', name: 'Take Out', group: 'B1T1_CUSTOMIZATION', price: 0 }
    ]
  },
  {
    id: 'mod-group-add-ons',
    name: 'Add-Ons & Extras',
    type: 'ADD_ON',
    min_selection: 0,
    max_selection: 10,
    required: false,
    applicable_categories: ['BURGERS', 'DOUBLE CHEESE FRIES', 'FAVORITE', 'CLASSIC', 'SPECIALTY', 'ADD ONS'],
    options: [
      { id: 'opt-addon-siomai', name: 'Siomai', group: 'ADD_ON', price: 5, ingredient_id: 'ING-06', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-patty', name: 'Patty', group: 'ADD_ON', price: 15, ingredient_id: 'ING-01', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-egg', name: 'Egg', group: 'ADD_ON', price: 10, ingredient_id: 'ING-09', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-cheese', name: 'Cheese', group: 'ADD_ON', price: 5, ingredient_id: 'ING-11', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-shanghai', name: 'Shanghai', group: 'ADD_ON', price: 5, ingredient_id: 'ING-05', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-meatloaf', name: 'Meatloaf', group: 'ADD_ON', price: 10, ingredient_id: 'ING-10', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-hotdog', name: 'Hotdog', group: 'ADD_ON', price: 15, ingredient_id: 'ING-02', quantity_consumed: 1, unit: 'pcs' },
      { id: 'opt-addon-rice', name: 'Rice', group: 'ADD_ON', price: 10, ingredient_id: 'ING-12', quantity_consumed: 0.15, unit: 'kg' }
    ]
  }
];

export const INITIAL_PAYMENT_CONFIGS: PaymentConfiguration[] = [
  {
    id: 'pay-cfg-gcash',
    branch_id: null,
    payment_method: 'GCASH',
    account_name: 'TAGPUAN HQ / FRANCHISE CORP',
    account_number: '0917-888-TAGP (8247)',
    qr_image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%23007DFE"/><text x="100" y="40" fill="white" font-size="16" font-family="sans-serif" text-anchor="middle" font-weight="bold">GCash Official QR</text><rect x="35" y="55" width="130" height="130" fill="white" rx="8"/><rect x="50" y="70" width="30" height="30" fill="%23007DFE"/><rect x="120" y="70" width="30" height="30" fill="%23007DFE"/><rect x="50" y="140" width="30" height="30" fill="%23007DFE"/><rect x="95" y="105" width="35" height="35" fill="%23007DFE"/><text x="100" y="195" fill="%23007DFE" font-size="9" font-family="monospace" text-anchor="middle">TAGPUAN GCASH MERCH</text></svg>',
    instructions: 'Scan with GCash app. Verify account name is TAGPUAN HQ.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pay-cfg-maya',
    branch_id: null,
    payment_method: 'MAYA',
    account_name: 'TAGPUAN FOOD VENTURES',
    account_number: '0998-777-TAGP (8247)',
    qr_image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%2300A859"/><text x="100" y="40" fill="white" font-size="16" font-family="sans-serif" text-anchor="middle" font-weight="bold">Maya Business QR</text><rect x="35" y="55" width="130" height="130" fill="white" rx="8"/><rect x="50" y="70" width="30" height="30" fill="%2300A859"/><rect x="120" y="70" width="30" height="30" fill="%2300A859"/><rect x="50" y="140" width="30" height="30" fill="%2300A859"/><rect x="95" y="105" width="35" height="35" fill="%2300A859"/><text x="100" y="195" fill="%2300A859" font-size="9" font-family="monospace" text-anchor="middle">TAGPUAN MAYA MERCH</text></svg>',
    instructions: 'Scan using Maya or any QR Ph app. Ensure name is TAGPUAN FOOD VENTURES.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pay-cfg-qrph',
    branch_id: null,
    payment_method: 'QRPH',
    account_name: 'TAGPUAN NATIONAL QR PH',
    account_number: 'QRPH-TAGPUAN-0017',
    qr_image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%23D92D20"/><text x="100" y="40" fill="white" font-size="16" font-family="sans-serif" text-anchor="middle" font-weight="bold">National QR Ph</text><rect x="35" y="55" width="130" height="130" fill="white" rx="8"/><rect x="50" y="70" width="30" height="30" fill="%23D92D20"/><rect x="120" y="70" width="30" height="30" fill="%23D92D20"/><rect x="50" y="140" width="30" height="30" fill="%23D92D20"/><rect x="95" y="105" width="35" height="35" fill="%23D92D20"/><text x="100" y="195" fill="%23D92D20" font-size="9" font-family="monospace" text-anchor="middle">BSP STANDARDIZED QR PH</text></svg>',
    instructions: 'National QR Ph: Compatible with all Philippine Banks and e-Wallets.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pay-cfg-bank',
    branch_id: null,
    payment_method: 'BANK_TRANSFER',
    account_name: 'TAGPUAN BURGER & SIOMAI CORP (BDO)',
    account_number: '0012-3456-7890',
    qr_image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%231E293B"/><text x="100" y="40" fill="white" font-size="15" font-family="sans-serif" text-anchor="middle" font-weight="bold">BDO Bank Transfer</text><rect x="35" y="55" width="130" height="130" fill="white" rx="8"/><rect x="50" y="70" width="30" height="30" fill="%231E293B"/><rect x="120" y="70" width="30" height="30" fill="%231E293B"/><rect x="50" y="140" width="30" height="30" fill="%231E293B"/><rect x="95" y="105" width="35" height="35" fill="%231E293B"/><text x="100" y="195" fill="%231E293B" font-size="9" font-family="monospace" text-anchor="middle">TAGPUAN BDO CA-0012</text></svg>',
    instructions: 'Bank Transfer via InstaPay/PESONet to BDO Account 0012-3456-7890.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
