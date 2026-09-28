import { Supplier } from '../src/types/index';

export const CENTRAL_WAREHOUSE_ID = 'central-warehouse-commissary';
export const CENTRAL_WAREHOUSE_NAME = 'Tagpuan Central Warehouse / Commissary';

export const INITIAL_SUPPLIERS: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    supplier_code: 'SUP-001',
    name: 'San Miguel Foods Inc. (Meat Division)',
    contact_person: 'Eduardo Ramos',
    contact_number: '+63 917 888 1234',
    email: 'orders@sanmiguelfoods.com.ph',
    address: 'Ortigas Center, Pasig City, Metro Manila',
    is_active: true
  },
  {
    supplier_code: 'SUP-002',
    name: 'Gardenia Bakeries Philippines Inc.',
    contact_person: 'Lorna Del Rosario',
    contact_number: '+63 918 555 4321',
    email: 'commercial@gardenia.com.ph',
    address: 'Laguna International Industrial Park, Biñan, Laguna',
    is_active: true
  },
  {
    supplier_code: 'SUP-003',
    name: 'Universal Robina Commercial Supply',
    contact_person: 'Antonio Sy',
    contact_number: '+63 920 777 9876',
    email: 'distribution@urc.com.ph',
    address: 'Pasig City, Metro Manila',
    is_active: true
  },
  {
    supplier_code: 'SUP-004',
    name: 'Dizon Farms Fresh Products & Condiments',
    contact_person: 'Maria Clara Dizon',
    contact_number: '+63 919 444 6543',
    email: 'supplies@dizonfarms.ph',
    address: 'FTI Complex, Taguig City',
    is_active: true
  },
  {
    supplier_code: 'SUP-005',
    name: 'Golden Ace Packaging & Disposables',
    contact_person: 'Roberto Lim',
    contact_number: '+63 917 333 8765',
    email: 'sales@goldenacepack.com',
    address: 'Valenzuela City, Metro Manila',
    is_active: true
  }
];

export const INITIAL_COMMISSARY_STOCK_RATIOS: Record<string, number> = {
  'ING-PATTY': 3500,
  'ING-BUN': 3500,
  'ING-SIOMAI': 2000,
  'ING-FRIES-CRINKLE': 450,
  'ING-CHEESE-SAUCE': 120,
  'ING-CHILI-GARLIC': 150,
  'ING-EGG': 1800,
  'ING-HOTDOG': 1200,
  'ING-MAYO': 85,
  'ING-KETCHUP': 90,
  'ING-RICE': 600,
  'ING-OIL': 250,
  'ING-FLAVOR-SOURCREAM': 80,
  'ING-FLAVOR-CHEESE': 80,
  'ING-FLAVOR-BBQ': 80,
  'ING-BURGER-WRAPPER': 5000,
  'ING-FRIES-BAG': 3000,
  'ING-SIOMAI-SAUCER': 3000,
  'ING-DRINK-CUP': 4000
};
