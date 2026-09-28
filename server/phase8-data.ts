import {
  CashDenominationCount,
  CashierShift,
  CashRemittance,
  BranchExpense,
  ExpenseCategory,
  ExpensePaymentMethod
} from '../src/types/index';

export const INITIAL_EXPENSES_SEEDS = [
  {
    branch_name: 'Narra',
    date: new Date().toISOString().split('T')[0],
    category: 'SUPPLIES' as ExpenseCategory,
    description: 'Emergency clean paper bags and food grade gloves from local market',
    amount: 500,
    payment_method: 'CASH' as ExpensePaymentMethod,
    proof_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    status: 'APPROVED' as const
  },
  {
    branch_name: 'Narra',
    date: new Date().toISOString().split('T')[0],
    category: 'TRANSPORTATION' as ExpenseCategory,
    description: 'Tricycle freight for emergency ice bag supply',
    amount: 150,
    payment_method: 'CASH' as ExpensePaymentMethod,
    proof_image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    status: 'APPROVED' as const
  },
  {
    branch_name: 'Acacia',
    date: new Date().toISOString().split('T')[0],
    category: 'DELIVERY' as ExpenseCategory,
    description: 'Special courier dispatch for seasonal sauce stock',
    amount: 450,
    payment_method: 'GCASH' as ExpensePaymentMethod,
    proof_image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    status: 'APPROVED' as const
  },
  {
    branch_name: 'Pulido',
    date: new Date().toISOString().split('T')[0],
    category: 'UTILITIES' as ExpenseCategory,
    description: 'Drinking water 5-gallon refilling station expense',
    amount: 300,
    payment_method: 'CASH' as ExpensePaymentMethod,
    proof_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    status: 'PENDING' as const
  }
];
