import { LoyaltyCustomer, LoyaltyTransaction, LoyaltyRedemption, SavedTicket } from '../src/types/index';

export const INITIAL_LOYALTY_CUSTOMERS: Omit<LoyaltyCustomer, 'registered_branch_id' | 'registered_branch_name'>[] = [
  {
    id: 'cust-1',
    customer_name: 'Maria Santos',
    phone_number: '0917-555-1021',
    email: 'maria.santos@gmail.com',
    current_points: 240,
    total_points_earned: 240,
    total_points_redeemed: 0,
    notes: 'Regular diner - Tagpuan fan',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'cust-2',
    customer_name: 'Juan Dela Cruz',
    phone_number: '0918-888-2345',
    email: 'juan.delacruz@yahoo.com',
    current_points: 160,
    total_points_earned: 160,
    total_points_redeemed: 0,
    notes: 'Loyal customer, frequent lunch takeout',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'cust-3',
    customer_name: 'Angelica Reyes',
    phone_number: '0922-333-7890',
    email: 'angelica.reyes@hotmail.com',
    current_points: 210,
    total_points_earned: 410,
    total_points_redeemed: 200,
    notes: 'Claimed 1 Burger reward previously',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'cust-4',
    customer_name: 'Carlo Mendoza',
    phone_number: '0995-123-4567',
    email: null,
    current_points: 90,
    total_points_earned: 90,
    total_points_redeemed: 0,
    notes: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'cust-5',
    customer_name: 'Beatrice Tan',
    phone_number: '0908-777-6543',
    email: 'beatrice.tan@outlook.com',
    current_points: 300,
    total_points_earned: 300,
    total_points_redeemed: 0,
    notes: 'Eligible for reward redemption (300 pts)',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'cust-6',
    customer_name: 'Kenneth Ramos',
    phone_number: '0919-444-9876',
    email: null,
    current_points: 40,
    total_points_earned: 40,
    total_points_redeemed: 0,
    notes: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];
