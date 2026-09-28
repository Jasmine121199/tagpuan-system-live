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
  XCircle
} from 'lucide-react';
import { Product, Recipe, Branch } from '../../types/index';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';

interface ProductTableProps {
  products: Product[];
  recipes: Recipe[];
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

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  recipes,
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
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-800">
          <thead className="bg-zinc-100 text-[10px] font-mono font-bold uppercase text-zinc-500 border-b border-zinc-200">
            <tr>
              <th className="py-3 px-4">Image</th>
              <th className="py-3 px-4">Product Code</th>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Price (₱)</th>
              <th className="py-3 px-4 text-center">Availability</th>
              <th className="py-3 px-4">Recipe Status</th>
              <th className="py-3 px-4">Branch Availability</th>
              <th className="py-3 px-4">Last Updated</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map(prod => {
              const recipe = recipes.find(r => r.product_id === prod.id);
              const hasRecipe = Boolean(recipe && recipe.items && recipe.items.length > 0);
              const isAvailable = prod.is_available !== false;
              const isActive = prod.is_active !== false;
              const unavailableCount = prod.unavailable_branches?.length || 0;
              const availableBranches = branches.length - unavailableCount;

              return (
                <tr
                  key={prod.id}
                  id={`product-row-${prod.product_code}`}
                  className={`hover:bg-zinc-50/80 transition ${
                    !isActive ? 'opacity-60 bg-zinc-50/50' : ''
                  }`}
                >
                  {/* Image */}
                  <td className="py-3 px-4">
                    <div
                      onClick={() => isOwner && onManageImage(prod)}
                      className={`w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0 ${
                        isOwner ? 'cursor-pointer hover:opacity-80' : ''
                      }`}
                      title={isOwner ? 'Click to change image' : undefined}
                    >
                      <img
                        src={getProductImageWithFallback(prod.product_image, prod.product_name, prod.category)}
                        alt={prod.product_name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = getFoodSvgForProduct(prod.product_name, prod.category);
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>

                  {/* Product Code */}
                  <td className="py-3 px-4 font-mono font-bold text-zinc-600">
                    {prod.product_code}
                  </td>

                  {/* Product Name */}
                  <td className="py-3 px-4 font-extrabold text-zinc-900 max-w-[200px]">
                    <div className="truncate">{prod.product_name}</div>
                    {prod.description && (
                      <div className="text-[10px] text-zinc-400 truncate font-normal">
                        {prod.description}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-zinc-100 text-zinc-700">
                      {prod.category}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => isOwner && onQuickPrice(prod)}
                      className={`font-black text-sm text-zinc-900 inline-flex items-center gap-1 ${
                        isOwner ? 'hover:text-emerald-700 hover:underline' : ''
                      }`}
                      title={isOwner ? 'Click to edit price' : undefined}
                    >
                      <span>₱{prod.selling_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </button>
                  </td>

                  {/* Availability */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => isOwner && onToggleAvailability(prod)}
                      disabled={!isOwner}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-xl uppercase tracking-wider transition ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {isAvailable ? 'In Stock' : 'Sold Out'}
                    </button>
                  </td>

                  {/* Recipe Status */}
                  <td className="py-3 px-4">
                    {hasRecipe ? (
                      <button
                        type="button"
                        onClick={() => onConfigureRecipe(prod)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{recipe?.items.length} Ingredients</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onConfigureRecipe(prod)}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg hover:bg-amber-200 transition"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Recipe not configured</span>
                      </button>
                    )}
                  </td>

                  {/* Branch Availability */}
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => isOwner && onManageBranches(prod)}
                      className="text-left group"
                    >
                      <div className="flex items-center gap-1 text-zinc-700 font-medium">
                        <Store className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-800" />
                        <span className="group-hover:underline">
                          {unavailableCount === 0 ? (
                            'All Branches'
                          ) : (
                            <span className="text-amber-700 font-bold">{availableBranches}/{branches.length} Branches</span>
                          )}
                        </span>
                      </div>
                    </button>
                  </td>

                  {/* Updated Date */}
                  <td className="py-3 px-4 font-mono text-[10px] text-zinc-400">
                    {prod.updated_at ? new Date(prod.updated_at).toLocaleDateString() : 'Active'}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    {isOwner && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onQuickPrice(prod)}
                          title="Change Price"
                          className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onManageImage(prod)}
                          title="Change Photo"
                          className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onConfigureRecipe(prod)}
                          title="Configure Recipe"
                          className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        >
                          <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onManageBranches(prod)}
                          title="Branch Availability"
                          className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        >
                          <Store className="w-3.5 h-3.5 text-purple-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(prod)}
                          title="Edit Details"
                          className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(prod)}
                          title="Delete/Archive"
                          className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
