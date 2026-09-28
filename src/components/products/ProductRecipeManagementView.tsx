import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Edit2,
  DollarSign,
  ChefHat,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Save,
  Trash2,
  RefreshCw,
  Eye,
  Info,
  Sliders,
  Store,
  LayoutGrid,
  List,
  AlertTriangle,
  Upload,
  X
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Product,
  Ingredient,
  Recipe,
  ProductCategory,
  Branch,
  MenuCategory,
  ModifierGroup
} from '../../types/index';
import { ProductCard } from './ProductCard';
import { ProductTable } from './ProductTable';
import { QuickPriceModal } from './QuickPriceModal';
import { ProductImageModal } from './ProductImageModal';
import { AIMenuImageMatcherModal } from './AIMenuImageMatcherModal';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';
import { BranchAvailabilityModal } from './BranchAvailabilityModal';
import { CategoryTab } from './CategoryTab';
import { ModifiersTab } from './ModifiersTab';

export const ProductRecipeManagementView: React.FC = () => {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'modifiers' | 'ingredients'>('products');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isAIMatcherOpen, setIsAIMatcherOpen] = useState(false);

  // Master Data
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);

  // State Management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [recipeFilter, setRecipeFilter] = useState<'ALL' | 'CONFIGURED' | 'INCOMPLETE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Quick Action Modals
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(null);
  const [branchModalProduct, setBranchModalProduct] = useState<Product | null>(null);
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<Product | null>(null);

  // Recipe Modal
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<{
    ingredient_id: string;
    quantity_consumed: number;
    unit: string;
    extraction_code?: string;
  }[]>([]);

  // Ingredients Modals
  const [isCreateIngredientOpen, setIsCreateIngredientOpen] = useState(false);
  const [isEditIngredientOpen, setIsEditIngredientOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Product Form State
  const [productForm, setProductForm] = useState<{
    product_code: string;
    product_name: string;
    category: ProductCategory;
    description: string;
    selling_price: number;
    product_image: string;
    badge: string;
    is_available: boolean;
    is_active: boolean;
    display_order?: number;
    unavailable_branches?: string[];
  }>({
    product_code: '',
    product_name: '',
    category: 'BURGERS',
    description: '',
    selling_price: 0,
    product_image: '',
    badge: '',
    is_available: true,
    is_active: true,
    display_order: 1,
    unavailable_branches: []
  });

  // Ingredient Form State
  const [ingredientForm, setIngredientForm] = useState({
    item_code: '',
    item_name: '',
    category: 'MEAT_PATTY',
    unit: 'pcs',
    cost_price: 0,
    reorder_level: 10,
    maximum_stock: 100,
    is_active: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [prodsData, ingsData, recsData, branchData, catData, modData] = await Promise.all([
        api.getProducts(),
        api.getIngredients(),
        api.getRecipes(),
        api.getBranches().catch(() => []),
        api.getCategories().catch(() => []),
        api.getModifierGroups().catch(() => [])
      ]);
      setProducts(prodsData);
      setIngredients(ingsData);
      setRecipes(recsData);
      setBranches(branchData);
      setCategories(catData);
      setModifierGroups(modData);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // --- Product Handlers ---
  const handleOpenCreateProduct = () => {
    setProductForm({
      product_code: `PRD-${String(products.length + 1).padStart(3, '0')}`,
      product_name: '',
      category: categories.length > 0 ? (categories[0].name as ProductCategory) : 'BURGERS',
      description: '',
      selling_price: 25,
      product_image: '',
      badge: '',
      is_available: true,
      is_active: true,
      display_order: products.length + 1,
      unavailable_branches: []
    });
    setIsCreateProductOpen(true);
  };

  const handleCreateProduct = async (e?: React.FormEvent, setRecipeAfter: boolean = false) => {
    if (e) e.preventDefault();
    if (!productForm.product_name.trim()) {
      setError('Product name is required.');
      return;
    }
    try {
      setError(null);
      const created = await api.createProduct({
        ...productForm,
        name: productForm.product_name,
        badge: productForm.badge.trim() || undefined,
        badges: productForm.badge.trim() ? [productForm.badge.trim()] : []
      });
      setIsCreateProductOpen(false);
      showNotification(`Product "${created.product_name}" created & published to POS & Kiosk.`);
      await fetchData();

      if (setRecipeAfter) {
        handleOpenRecipeEditor(created);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductForm({
      product_code: prod.product_code,
      product_name: prod.product_name || prod.name || '',
      category: prod.category,
      description: prod.description || '',
      selling_price: prod.selling_price,
      product_image: prod.product_image || '',
      badge: prod.badge || (prod.badges && prod.badges[0]) || '',
      is_available: prod.is_available !== false,
      is_active: prod.is_active !== false,
      display_order: prod.display_order || 1,
      unavailable_branches: prod.unavailable_branches || []
    });
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      setError(null);
      await api.updateProduct(selectedProduct.id, {
        ...productForm,
        name: productForm.product_name,
        badge: productForm.badge.trim() || undefined,
        badges: productForm.badge.trim() ? [productForm.badge.trim()] : []
      });
      setIsEditProductOpen(false);
      showNotification(`Product "${productForm.product_name}" updated across all POS & Kiosks.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update product.');
    }
  };

  const handleQuickPriceUpdate = async (productId: string, newPrice: number) => {
    await api.updateProduct(productId, { selling_price: newPrice });
    showNotification('Price updated immediately for all new POS & Kiosk orders.');
    fetchData();
  };

  const handleUploadImage = async (productId: string, imageData: string) => {
    await api.updateProduct(productId, { product_image: imageData });
    showNotification('Product photo saved and updated across POS & Kiosks.');
    fetchData();
  };

  const handleRemoveImage = async (productId: string) => {
    await api.updateProduct(productId, { product_image: '' });
    showNotification('Product image reset to default placeholder.');
    fetchData();
  };

  const handleSaveBranchAvailability = async (productId: string, unavailableBranchIds: string[]) => {
    await api.updateProductBranchAvailability(productId, unavailableBranchIds);
    showNotification('Branch menu availability updated successfully.');
    fetchData();
  };

  const handleToggleAvailability = async (prod: Product) => {
    const nextState = prod.is_available === false;
    try {
      await api.toggleProductAvailability(prod.id, nextState);
      showNotification(`"${prod.product_name}" is now marked ${nextState ? 'IN STOCK' : 'SOLD OUT'}.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle availability.');
    }
  };

  const handleToggleActive = async (prod: Product) => {
    const nextState = !prod.is_active;
    try {
      await api.toggleProductStatus(prod.id, nextState);
      showNotification(`"${prod.product_name}" status set to ${nextState ? 'ACTIVE' : 'INACTIVE'}.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!window.confirm(`Are you sure you want to delete/archive "${prod.product_name}"?`)) {
      return;
    }
    try {
      setError(null);
      const res = await api.deleteProduct(prod.id);
      showNotification(res.message || `Product "${prod.product_name}" archived.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    }
  };

  // Image Helper for Create/Edit Modal
  const handleDirectImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setProductForm(prev => ({ ...prev, product_image: canvas.toDataURL('image/jpeg', 0.85) }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- Recipe Handlers ---
  const handleOpenRecipeEditor = (product: Product) => {
    setSelectedRecipeProduct(product);
    const existing = recipes.find(r => r.product_id === product.id);

    if (existing && existing.items.length > 0) {
      setRecipeItems(existing.items.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity_consumed: item.quantity_consumed,
        unit: item.unit,
        extraction_code: item.extraction_code || ''
      })));
    } else {
      if (ingredients.length > 0) {
        setRecipeItems([{
          ingredient_id: ingredients[0].id,
          quantity_consumed: 1,
          unit: ingredients[0].unit,
          extraction_code: `REC-${product.product_code}-01`
        }]);
      } else {
        setRecipeItems([]);
      }
    }
    setIsRecipeModalOpen(true);
  };

  const handleAddRecipeItem = () => {
    if (ingredients.length === 0) return;
    setRecipeItems([
      ...recipeItems,
      {
        ingredient_id: ingredients[0].id,
        quantity_consumed: 1,
        unit: ingredients[0].unit,
        extraction_code: `REC-${selectedRecipeProduct?.product_code}-${recipeItems.length + 1}`
      }
    ]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    const updated = [...recipeItems];
    updated.splice(index, 1);
    setRecipeItems(updated);
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipeProduct) return;
    if (recipeItems.length === 0) {
      setError('Recipe must contain at least 1 ingredient item.');
      return;
    }
    try {
      setError(null);
      await api.saveRecipe({
        product_id: selectedRecipeProduct.id,
        name: `${selectedRecipeProduct.product_name} Recipe`,
        description: `Authoritative recipe configuration for ${selectedRecipeProduct.product_name}`,
        is_active: true,
        items: recipeItems.map(item => ({
          ingredient_id: item.ingredient_id,
          quantity_consumed: Number(item.quantity_consumed),
          unit: item.unit,
          extraction_code: item.extraction_code || null
        }))
      });
      setIsRecipeModalOpen(false);
      showNotification(`Recipe for "${selectedRecipeProduct.product_name}" saved to database.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe.');
    }
  };

  const calculateRecipeCost = (recItems: typeof recipeItems) => {
    let totalCost = 0;
    recItems.forEach(item => {
      const ing = ingredients.find(i => i.id === item.ingredient_id);
      if (ing) {
        totalCost += (ing.cost_price || 0) * (item.quantity_consumed || 0);
      }
    });
    return Math.round(totalCost * 100) / 100;
  };

  // --- Ingredient Handlers ---
  const handleOpenCreateIngredient = () => {
    setIngredientForm({
      item_code: `ING-${String(ingredients.length + 1).padStart(3, '0')}`,
      item_name: '',
      category: 'MISC',
      unit: 'pcs',
      cost_price: 10,
      reorder_level: 20,
      maximum_stock: 200,
      is_active: true
    });
    setIsCreateIngredientOpen(true);
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await api.createIngredient(ingredientForm);
      setIsCreateIngredientOpen(false);
      showNotification(`Ingredient "${ingredientForm.item_name}" added to inventory catalog.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create ingredient.');
    }
  };

  // Filtering Logic
  const filteredProducts = products.filter(p => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = p.product_code?.toLowerCase().includes(q);
      const nameMatch = (p.product_name || p.name || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch) return false;
    }

    // Category
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
      return false;
    }

    // Availability
    if (availabilityFilter === 'AVAILABLE' && p.is_available === false) return false;
    if (availabilityFilter === 'UNAVAILABLE' && p.is_available !== false) return false;
    if (availabilityFilter === 'ACTIVE' && p.is_active === false) return false;
    if (availabilityFilter === 'INACTIVE' && p.is_active !== false) return false;

    // Recipe Status
    const recipe = recipes.find(r => r.product_id === p.id);
    const hasRecipe = Boolean(recipe && recipe.items && recipe.items.length > 0);
    if (recipeFilter === 'CONFIGURED' && !hasRecipe) return false;
    if (recipeFilter === 'INCOMPLETE' && hasRecipe) return false;

    return true;
  });

  // Unique Categories for Filter
  const availableCategoryTabs = [
    { label: 'All Categories', value: 'ALL' },
    ...Array.from(new Set([
      'BURGERS',
      'DOUBLE CHEESE FRIES',
      'FAVORITE',
      'CLASSIC',
      'SPECIALTY',
      'DRINKS',
      'ADD ONS',
      ...categories.map(c => c.name)
    ])).map(c => ({
      label: c.replace(/_/g, ' '),
      value: c
    }))
  ];

  // Stats
  const totalProducts = products.length;
  const inStockCount = products.filter(p => p.is_available !== false).length;
  const recipeConfiguredCount = products.filter(p => {
    const r = recipes.find(rec => rec.product_id === p.id);
    return Boolean(r && r.items && r.items.length > 0);
  }).length;
  const incompleteRecipeCount = totalProducts - recipeConfiguredCount;

  return (
    <div className="space-y-6">
      {/* Header Banner with Tagpuan Visual Identity */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-mono font-black rounded-lg bg-[#CDEBC5] text-[#111111]">
              CENTRAL MENU SOURCE OF TRUTH
            </span>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">
              Tagpuan Master Menu Management
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
            Single authoritative database driving POS, Customer Kiosk, KDS, product recipes, and inventory deductions. All updates immediately synchronize across branches.
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {activeTab === 'products' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsAIMatcherOpen(true)}
                  id="btn-ai-menu-matcher"
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-[#CDEBC5] text-xs font-black rounded-2xl flex items-center gap-2 shadow-sm transition border border-zinc-800"
                >
                  <Sparkles className="w-4 h-4 text-[#CDEBC5]" />
                  <span>AI Photo Matcher</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateProduct}
                  id="btn-add-menu-item"
                  className="px-4 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm transition"
                >
                  <Plus className="w-4 h-4 text-[#CDEBC5]" />
                  <span>Add New Menu Item</span>
                </button>
              </>
            )}
            {activeTab === 'ingredients' && (
              <button
                type="button"
                onClick={handleOpenCreateIngredient}
                className="px-4 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm transition"
              >
                <Plus className="w-4 h-4 text-[#CDEBC5]" />
                <span>Add Raw Ingredient</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 pb-2 gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            id="tab-products"
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Package className="w-4 h-4 text-[#CDEBC5]" />
            <span>Menu Items ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            id="tab-categories"
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Layers className="w-4 h-4 text-[#CDEBC5]" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('modifiers')}
            id="tab-modifiers"
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'modifiers'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#CDEBC5]" />
            <span>Modifiers & Add-Ons ({modifierGroups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ingredients')}
            id="tab-ingredients"
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'ingredients'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <ChefHat className="w-4 h-4 text-[#CDEBC5]" />
            <span>Raw Ingredients Catalog ({ingredients.length})</span>
          </button>
        </div>

        {/* Live Metrics Pills */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono font-bold">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {inStockCount} In Stock
          </span>
          {incompleteRecipeCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {incompleteRecipeCount} Need Recipes
            </span>
          )}
        </div>
      </div>

      {/* TAB 1: MENU ITEMS & PRICING */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search, Filter & View Controls */}
          <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search by Name or Code */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products by name or code (e.g. Cheese Burger, PRD-001)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#CDEBC5] text-zinc-900 font-medium"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {/* Availability Filter */}
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 font-bold text-zinc-700 focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                >
                  <option value="ALL">All Availability</option>
                  <option value="AVAILABLE">In Stock Only</option>
                  <option value="UNAVAILABLE">Sold Out Only</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Archived / Inactive</option>
                </select>

                {/* Recipe Status Filter */}
                <select
                  value={recipeFilter}
                  onChange={(e) => setRecipeFilter(e.target.value as any)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 font-bold text-zinc-700 focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                >
                  <option value="ALL">All Recipes</option>
                  <option value="CONFIGURED">Recipe Configured</option>
                  <option value="INCOMPLETE">Recipe Incomplete</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-xl transition ${
                      viewMode === 'cards' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Food-Menu Cards Grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-xl transition ${
                      viewMode === 'table' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Admin Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
              {availableCategoryTabs.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 transition ${
                    categoryFilter === cat.value
                      ? 'bg-[#111111] text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Display */}
          {isLoading ? (
            <div className="py-20 text-center text-xs text-zinc-400 bg-white rounded-3xl border border-zinc-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-zinc-300" />
              Loading authoritative menu items & recipes...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400 bg-white rounded-3xl border border-zinc-200 p-6">
              <Package className="w-12 h-12 mx-auto mb-2 text-zinc-300" />
              <h4 className="text-sm font-black text-zinc-700">No matching menu items found</h4>
              <p className="text-xs text-zinc-400 mt-1">Try clearing your filters or search keywords.</p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('ALL');
                  setAvailabilityFilter('ALL');
                  setRecipeFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 px-3.5 py-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-700"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(prod => {
                const rec = recipes.find(r => r.product_id === prod.id);
                return (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    recipe={rec}
                    branches={branches}
                    isOwner={isOwner}
                    onEdit={handleOpenEditProduct}
                    onQuickPrice={(p) => setQuickPriceProduct(p)}
                    onManageImage={(p) => setImageModalProduct(p)}
                    onConfigureRecipe={handleOpenRecipeEditor}
                    onManageBranches={(p) => setBranchModalProduct(p)}
                    onToggleAvailability={handleToggleAvailability}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDeleteProduct}
                  />
                );
              })}
            </div>
          ) : (
            <ProductTable
              products={filteredProducts}
              recipes={recipes}
              branches={branches}
              isOwner={isOwner}
              onEdit={handleOpenEditProduct}
              onQuickPrice={(p) => setQuickPriceProduct(p)}
              onManageImage={(p) => setImageModalProduct(p)}
              onConfigureRecipe={handleOpenRecipeEditor}
              onManageBranches={(p) => setBranchModalProduct(p)}
              onToggleAvailability={handleToggleAvailability}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteProduct}
            />
          )}
        </div>
      )}

      {/* TAB 2: CATEGORY MANAGEMENT */}
      {activeTab === 'categories' && (
        <CategoryTab
          categories={categories}
          isOwner={isOwner}
          onRefresh={fetchData}
          showNotification={showNotification}
        />
      )}

      {/* TAB 3: MODIFIERS & ADD-ONS */}
      {activeTab === 'modifiers' && (
        <ModifiersTab
          modifierGroups={modifierGroups}
          isOwner={isOwner}
          onRefresh={fetchData}
          showNotification={showNotification}
        />
      )}

      {/* TAB 4: RAW INGREDIENTS CATALOG */}
      {activeTab === 'ingredients' && (
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Master Raw Ingredients Catalog & Stock Costs
              </h3>
              <p className="text-xs text-zinc-500">
                Ingredients are automatically synced across all Tagpuan branches. Recipes link directly to these items.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-600 bg-white px-3 py-1 rounded-xl border border-zinc-200">
              {ingredients.length} Total Ingredients
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800">
              <thead className="bg-zinc-100 text-[10px] font-mono font-bold uppercase text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Ingredient Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4 text-right">Cost Price (₱)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {ingredients.map(ing => (
                  <tr key={ing.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-600">{ing.item_code}</td>
                    <td className="py-3 px-4 font-black text-zinc-900">{ing.item_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-mono">
                        {ing.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600">{ing.unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                      ₱{ing.cost_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE MENU ITEM */}
      {/* ========================================================================= */}
      {isCreateProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#CDEBC5] flex items-center justify-center text-[#111111]">
                  <Plus className="w-4 h-4 font-black" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 tracking-tight">Add New Menu Item</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Published to POS & Kiosk immediately</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateProductOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateProduct(e, false)} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Product Code & Name */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Product Code</label>
                  <input
                    type="text"
                    required
                    value={productForm.product_code}
                    onChange={(e) => setProductForm({ ...productForm, product_code: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cheese Burger with Fries"
                    value={productForm.product_name}
                    onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="BURGERS">BURGERS</option>
                        <option value="DOUBLE CHEESE FRIES">DOUBLE CHEESE FRIES</option>
                        <option value="FAVORITE">FAVORITE</option>
                        <option value="CLASSIC">CLASSIC</option>
                        <option value="SPECIALTY">SPECIALTY</option>
                        <option value="DRINKS">DRINKS</option>
                        <option value="ADD ONS">ADD ONS</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Selling Price (₱)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Product Badge / Tag (Optional)</label>
                <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
                  {['BESTSELLER', 'NEW', 'CHEF SPECIAL', 'POPULAR', 'MUST TRY', 'SPICY'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, badge: productForm.badge === b ? '' : b })}
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg transition border ${
                        productForm.badge === b
                          ? 'bg-[#111111] text-[#CDEBC5] border-black'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom badge (e.g., CRISPY, VEGGIE)..."
                  value={productForm.badge}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  className="w-full p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the food item for customers and cashiers..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                />
              </div>

              {/* Direct Photo Upload & URL */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Food Image (Upload File or Paste URL)</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={getProductImageWithFallback(productForm.product_image, productForm.product_name, productForm.category)}
                      alt="Preview"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.src = getFoodSvgForProduct(productForm.product_name, productForm.category);
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-800 transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{productForm.product_image ? 'Replace File' : 'Upload File'}</span>
                      </button>
                      {productForm.product_image && (
                        <button
                          type="button"
                          onClick={() => setProductForm(prev => ({ ...prev, product_image: '' }))}
                          className="text-[11px] text-rose-600 hover:underline font-bold"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="Or paste direct image URL (https://...)"
                      value={productForm.product_image}
                      onChange={(e) => setProductForm({ ...productForm, product_image: e.target.value })}
                      className="w-full p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleDirectImageSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Availability & Active Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-zinc-800">Initial Stock</span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg ${
                    productForm.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {productForm.is_available ? 'In Stock' : 'Sold Out'}
                  </span>
                  <input
                    type="checkbox"
                    checked={productForm.is_available}
                    onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })}
                    className="hidden"
                  />
                </label>

                <label className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-zinc-800">Active Status</span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg ${
                    productForm.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
                  }`}>
                    {productForm.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Branch Availability Checkboxes */}
              {branches.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">
                    Branch Availability ({branches.length} Branches)
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-50 rounded-2xl border border-zinc-200">
                    {branches.map(b => {
                      const isUnavailable = productForm.unavailable_branches?.includes(b.id);
                      return (
                        <label key={b.id} className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!isUnavailable}
                            onChange={(e) => {
                              const curr = productForm.unavailable_branches || [];
                              if (e.target.checked) {
                                setProductForm({
                                  ...productForm,
                                  unavailable_branches: curr.filter(id => id !== b.id)
                                });
                              } else {
                                setProductForm({
                                  ...productForm,
                                  unavailable_branches: [...curr, b.id]
                                });
                              }
                            }}
                            className="rounded text-[#111111] focus:ring-[#CDEBC5]"
                          />
                          <span className="truncate">{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsCreateProductOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateProduct(undefined, true)}
                  className="px-4 py-2 text-xs font-bold bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800 rounded-xl shadow-2xs flex items-center gap-1.5"
                >
                  <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                  <span>Create & Set Recipe</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateProduct(e, false)}
                  className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black text-white rounded-xl shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                  <span>Create Product</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT MENU ITEM */}
      {/* ========================================================================= */}
      {isEditProductOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">Edit Menu Item</h3>
                <p className="text-[11px] text-zinc-500 font-mono">{selectedProduct.product_code} • {selectedProduct.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProductOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Product Code</label>
                  <input
                    type="text"
                    required
                    value={productForm.product_code}
                    onChange={(e) => setProductForm({ ...productForm, product_code: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.product_name}
                    onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="BURGERS">BURGERS</option>
                        <option value="DOUBLE CHEESE FRIES">DOUBLE CHEESE FRIES</option>
                        <option value="FAVORITE">FAVORITE</option>
                        <option value="CLASSIC">CLASSIC</option>
                        <option value="SPECIALTY">SPECIALTY</option>
                        <option value="DRINKS">DRINKS</option>
                        <option value="ADD ONS">ADD ONS</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Selling Price (₱)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Product Badge / Tag (Optional)</label>
                <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
                  {['BESTSELLER', 'NEW', 'CHEF SPECIAL', 'POPULAR', 'MUST TRY', 'SPICY'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, badge: productForm.badge === b ? '' : b })}
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg transition border ${
                        productForm.badge === b
                          ? 'bg-[#111111] text-[#CDEBC5] border-black'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom badge (e.g., CRISPY, VEGGIE)..."
                  value={productForm.badge}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  className="w-full p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              {/* Photo Management & URL */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Food Image (Upload File or Paste URL)</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                    {productForm.product_image ? (
                      <img src={productForm.product_image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-800 transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{productForm.product_image ? 'Replace File' : 'Upload File'}</span>
                      </button>
                      {productForm.product_image && (
                        <button
                          type="button"
                          onClick={() => setProductForm(prev => ({ ...prev, product_image: '' }))}
                          className="text-[11px] text-rose-600 hover:underline font-bold"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="Or paste direct image URL (https://...)"
                      value={productForm.product_image}
                      onChange={(e) => setProductForm({ ...productForm, product_image: e.target.value })}
                      className="w-full p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleDirectImageSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-zinc-800">In Stock</span>
                  <input
                    type="checkbox"
                    checked={productForm.is_available}
                    onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })}
                    className="rounded text-[#111111] focus:ring-[#CDEBC5]"
                  />
                </label>

                <label className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-zinc-800">Active Status</span>
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                    className="rounded text-[#111111] focus:ring-[#CDEBC5]"
                  />
                </label>
              </div>
            </form>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditProductOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateProduct}
                className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black text-white rounded-xl shadow flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIGURE RECIPE (SET RECIPE) */}
      {/* ========================================================================= */}
      {isRecipeModalOpen && selectedRecipeProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-2xl w-full overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] flex items-center justify-center text-[#111111]">
                  <ChefHat className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                    Product Recipe Definition: {selectedRecipeProduct.product_name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {selectedRecipeProduct.product_code} • Selling Price: ₱{selectedRecipeProduct.selling_price.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs text-zinc-600 leading-relaxed">
                When an order for <strong>{selectedRecipeProduct.product_name}</strong> is completed, inventory will automatically deduct the exact quantities configured below.
              </div>

              {recipeItems.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Recipe not configured. Add ingredients below to link this product to inventory deductions.</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  Ingredients ({recipeItems.length})
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleAddRecipeItem}
                    className="px-3 py-1.5 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#CDEBC5]" />
                    <span>Add Ingredient</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {recipeItems.map((item, idx) => {
                  const ing = ingredients.find(i => i.id === item.ingredient_id);
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    >
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Ingredient</label>
                        <select
                          disabled={!isOwner}
                          value={item.ingredient_id}
                          onChange={(e) => {
                            const updated = [...recipeItems];
                            const selectedIng = ingredients.find(i => i.id === e.target.value);
                            updated[idx].ingredient_id = e.target.value;
                            if (selectedIng) {
                              updated[idx].unit = selectedIng.unit;
                            }
                            setRecipeItems(updated);
                          }}
                          className="w-full mt-0.5 p-2 text-xs bg-white border border-zinc-200 rounded-xl font-bold text-zinc-900"
                        >
                          {ingredients.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.item_name} ({i.unit}) - ₱{i.cost_price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          disabled={!isOwner}
                          value={item.quantity_consumed}
                          onChange={(e) => {
                            const updated = [...recipeItems];
                            updated[idx].quantity_consumed = parseFloat(e.target.value) || 0;
                            setRecipeItems(updated);
                          }}
                          className="w-full mt-0.5 p-2 text-xs bg-white border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900"
                        />
                      </div>

                      <div className="w-16">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Unit</label>
                        <input
                          type="text"
                          disabled
                          value={item.unit}
                          className="w-full mt-0.5 p-2 text-xs bg-zinc-100 border border-zinc-200 rounded-xl font-mono text-zinc-600 text-center"
                        />
                      </div>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeItem(idx)}
                          className="self-end sm:self-center pt-2 sm:pt-4 text-rose-500 hover:text-rose-700 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live Cost & Margin Calculator */}
              <div className="p-4 bg-zinc-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Total Recipe Cost</span>
                  <p className="text-xl font-black text-[#CDEBC5]">
                    ₱{calculateRecipeCost(recipeItems).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Gross Margin</span>
                  {(() => {
                    const cost = calculateRecipeCost(recipeItems);
                    const sp = selectedRecipeProduct.selling_price;
                    const margin = sp > 0 ? Math.round(((sp - cost) / sp) * 100) : 0;
                    return (
                      <p className={`text-xl font-black ${margin >= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {margin}%
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Close
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  id="btn-save-recipe"
                  className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black text-white rounded-xl shadow flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#CDEBC5]" />
                  <span>Save Recipe Definition</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE INGREDIENT */}
      {/* ========================================================================= */}
      {isCreateIngredientOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateIngredient} className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Add Master Raw Ingredient</h3>
              <button type="button" onClick={() => setIsCreateIngredientOpen(false)} className="text-zinc-400">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Item Code</label>
                <input
                  type="text"
                  required
                  value={ingredientForm.item_code}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, item_code: e.target.value.toUpperCase() })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sesame Burger Bun"
                  value={ingredientForm.item_name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, item_name: e.target.value })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category</label>
                  <input
                    type="text"
                    required
                    value={ingredientForm.category}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, category: e.target.value })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="pcs / g / ml / pack"
                    value={ingredientForm.unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Cost Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={ingredientForm.cost_price}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, cost_price: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateIngredientOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black text-white rounded-xl shadow flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                <span>Create Ingredient</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK PRICE MODAL */}
      {/* ========================================================================= */}
      {quickPriceProduct && (
        <QuickPriceModal
          product={quickPriceProduct}
          isOpen={Boolean(quickPriceProduct)}
          onClose={() => setQuickPriceProduct(null)}
          onUpdatePrice={handleQuickPriceUpdate}
        />
      )}

      {/* ========================================================================= */}
      {/* PRODUCT IMAGE MODAL */}
      {/* ========================================================================= */}
      {imageModalProduct && (
        <ProductImageModal
          product={imageModalProduct}
          allProducts={products}
          isOpen={Boolean(imageModalProduct)}
          onClose={() => setImageModalProduct(null)}
          onUploadImage={handleUploadImage}
          onRemoveImage={handleRemoveImage}
        />
      )}

      {/* ========================================================================= */}
      {/* AI MENU IMAGE MATCHER MODAL (GEMINI VISION) */}
      {/* ========================================================================= */}
      <AIMenuImageMatcherModal
        isOpen={isAIMatcherOpen}
        onClose={() => setIsAIMatcherOpen(false)}
        products={products}
        onProductUpdated={fetchData}
        onShowNotification={showNotification}
      />

      {/* ========================================================================= */}
      {/* BRANCH AVAILABILITY MODAL */}
      {/* ========================================================================= */}
      {branchModalProduct && (
        <BranchAvailabilityModal
          product={branchModalProduct}
          branches={branches}
          isOpen={Boolean(branchModalProduct)}
          onClose={() => setBranchModalProduct(null)}
          onSaveBranchAvailability={handleSaveBranchAvailability}
        />
      )}
    </div>
  );
};
