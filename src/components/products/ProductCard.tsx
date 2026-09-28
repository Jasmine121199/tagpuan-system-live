import React from 'react';
import {
  Package,
  DollarSign,
  ChefHat,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Store,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Product, Recipe, Branch } from '../../types/index';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';

interface ProductCardProps {
  product: Product;
  recipe?: Recipe;
  branches: Branch[];
  isOwner: boolean;
  onEdit: (product: Product) => void;
  onQuickPrice: (product: Product) => void;
  onManageImage: (product: Product) => void;
  onConfigureRecipe: (product: Product) => void;
  onManageBranches: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  recipe,
  branches,
  isOwner,
  onEdit,
  onQuickPrice,
  onManageImage,
  onConfigureRecipe,
  onManageBranches,
  onToggleAvailability,
  onToggleActive,
  onDelete
}) => {
  const isAvailable = product.is_available !== false;
  const isActive = product.is_active !== false;
  const hasRecipe = Boolean(recipe && recipe.items && recipe.items.length > 0);

  const unavailableCount = product.unavailable_branches?.length || 0;
  const availableBranchCount = branches.length - unavailableCount;

  return (
    <div
      id={`product-card-${product.product_code}`}
      className={`bg-white rounded-3xl border transition shadow-sm overflow-hidden flex flex-col justify-between group ${
        !isActive || !isAvailable ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      {/* Top Image Section */}
      <div>
        <div className="relative w-full h-44 bg-zinc-100 overflow-hidden border-b border-zinc-100 flex items-center justify-center">
          <img
            src={getProductImageWithFallback(product.product_image, product.product_name, product.category)}
            alt={product.product_name}
            onError={(e) => {
              const target = e.currentTarget;
              target.src = getFoodSvgForProduct(product.product_name, product.category);
            }}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              !isAvailable || !isActive ? 'grayscale opacity-75' : ''
            }`}
          />

          {/* Tagpuan Price Tag Badge */}
          <div className="absolute bottom-3 left-3 bg-[#111111]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl flex items-baseline gap-1 shadow-lg">
            <span className="text-xs text-[#CDEBC5] font-bold">₱</span>
            <span className="text-sm font-black tracking-tight">
              {product.selling_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Status Badges Overlay */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => isOwner && onToggleAvailability(product)}
              disabled={!isOwner}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl uppercase tracking-wider backdrop-blur-md shadow-sm transition ${
                isAvailable
                  ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                  : 'bg-rose-500/90 text-white hover:bg-rose-600'
              }`}
            >
              {isAvailable ? 'In Stock' : 'Sold Out'}
            </button>

            {!isActive && (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-zinc-800/80 text-zinc-300 rounded-lg uppercase backdrop-blur-md">
                Archived / Inactive
              </span>
            )}
          </div>

          {/* Quick Photo Change Overlay Button */}
          {isOwner && (
            <button
              type="button"
              onClick={() => onManageImage(product)}
              className="absolute top-3 left-3 p-2 bg-white/90 hover:bg-white text-zinc-800 rounded-xl shadow backdrop-blur-md transition opacity-0 group-hover:opacity-100"
              title="Change food picture"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                {product.product_code} • {product.category}
              </span>
              {product.display_order !== undefined && (
                <span className="text-[10px] font-mono text-zinc-400">
                  #{product.display_order}
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-zinc-900 tracking-tight leading-snug mt-0.5">
              {product.product_name}
            </h3>

            <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
              {product.description || 'Authentic Tagpuan comfort food made fresh to order.'}
            </p>
          </div>

          {/* Recipe & Branch Status */}
          <div className="space-y-1.5 pt-1">
            {/* Recipe Warning / Config */}
            {hasRecipe ? (
              <div className="flex items-center justify-between text-[11px] bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-100">
                <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                  <ChefHat className="w-3.5 h-3.5 text-emerald-600" />
                  Recipe Linked ({recipe?.items.length} items)
                </span>
                <button
                  type="button"
                  onClick={() => onConfigureRecipe(product)}
                  className="text-[10px] font-extrabold text-[#111111] hover:underline"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200/80">
                <span className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Recipe not configured
                </span>
                <button
                  type="button"
                  onClick={() => onConfigureRecipe(product)}
                  className="text-[10px] font-extrabold bg-[#111111] text-[#CDEBC5] px-2 py-0.5 rounded-lg shadow-sm"
                >
                  Set Recipe
                </button>
              </div>
            )}

            {/* Branch Availability */}
            <div className="flex items-center justify-between text-[11px] bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-100">
              <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                <Store className="w-3.5 h-3.5 text-zinc-500" />
                {unavailableCount === 0 ? (
                  <span>Available in all {branches.length} branches</span>
                ) : (
                  <span className="text-amber-700 font-bold">
                    {availableBranchCount} of {branches.length} branches
                  </span>
                )}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onManageBranches(product)}
                  className="text-[10px] font-extrabold text-[#111111] hover:underline"
                >
                  Branches
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owner Action Buttons Bar */}
      {isOwner && (
        <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onQuickPrice(product)}
              className="px-2.5 py-1.5 text-[11px] font-extrabold bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-800 flex items-center gap-1 transition shadow-2xs"
              title="Change selling price"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Price</span>
            </button>

            <button
              type="button"
              onClick={() => onManageImage(product)}
              className="px-2.5 py-1.5 text-[11px] font-extrabold bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-800 flex items-center gap-1 transition shadow-2xs"
              title="Upload / Change Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Photo</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="p-1.5 bg-white hover:bg-zinc-200 border border-zinc-200 rounded-xl text-zinc-700 transition"
              title="Edit all fields"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(product)}
              className="p-1.5 bg-white hover:bg-rose-50 border border-zinc-200 text-rose-600 hover:border-rose-200 rounded-xl transition"
              title="Delete or Archive Product"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
