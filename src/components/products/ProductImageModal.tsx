import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Product, AIMatchImageResponse } from '../../types/index';
import { api } from '../../lib/api';
import { uploadProductImageToSupabase, removeProductImageFromSupabase } from '../../lib/supabase';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';

interface ProductImageModalProps {
  product: Product;
  allProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
  onUploadImage: (productId: string, imageData: string) => Promise<void>;
  onRemoveImage: (productId: string) => Promise<void>;
  onReassignImage?: (sourceProductId: string, targetProductId: string, imageData: string) => Promise<void>;
}

type ModalView =
  | 'PREVIEW'
  | 'ANALYZING'
  | 'CONFIRM_SUGGESTION'
  | 'MANUAL_SELECTION'
  | 'REASSIGN_PRODUCT';

export const ProductImageModal: React.FC<ProductImageModalProps> = ({
  product,
  allProducts,
  isOpen,
  onClose,
  onUploadImage,
  onRemoveImage,
  onReassignImage
}) => {
  const [view, setView] = useState<ModalView>('PREVIEW');
  const [currentImage, setCurrentImage] = useState<string | null>(product.product_image || null);
  const [stagedNewImage, setStagedNewImage] = useState<string | null>(null);
  const [stagedMimeType, setStagedMimeType] = useState<string>('image/jpeg');
  const [aiAnalysis, setAiAnalysis] = useState<AIMatchImageResponse | null>(null);
  const [targetProduct, setTargetProduct] = useState<Product>(product);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [reassignSearchQuery, setReassignSearchQuery] = useState<string>('');
  const [reassignCategory, setReassignCategory] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(allProducts.map(p => p.category)))];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image file is too large (maximum 8MB).');
      return;
    }

    setErrorMessage(null);
    setStagedMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setStagedNewImage(dataUrl);
          setTargetProduct(product);
          setView('PREVIEW');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const analyzeWithGemini = async (imageData: string, mime: string) => {
    try {
      setView('ANALYZING');
      setErrorMessage(null);
      const res = await api.aiMatchProductImage(imageData, mime);
      setAiAnalysis(res);

      if (res.identified && res.product) {
        setTargetProduct(res.product);
        setView('CONFIRM_SUGGESTION');
      } else {
        // If not confidently identified, show the unconfident state and allow manual selection
        setTargetProduct(product);
        setView('MANUAL_SELECTION');
      }
    } catch (err: any) {
      console.error('[ProductImageModal] AI Vision matching failed:', err);
      setErrorMessage(err.message || 'AI vision matching encountered an issue. You can manually assign the product.');
      setView('MANUAL_SELECTION');
    }
  };

  const handleConfirmSave = async () => {
    const imageToSave = stagedNewImage || currentImage;
    if (!imageToSave) {
      setErrorMessage('No image available to save.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. Upload to Supabase Storage
      const storagePublicUrl = await uploadProductImageToSupabase(imageToSave, targetProduct.id);

      // 2. Persist to authoritative product database record
      await onUploadImage(targetProduct.id, storagePublicUrl);

      // Update local state and close
      setCurrentImage(storagePublicUrl);
      setStagedNewImage(null);
      onClose();
    } catch (err: any) {
      console.error('[ProductImageModal] Error saving image:', err);
      setErrorMessage(err.message || 'Failed to save product image.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm(`Are you sure you want to remove the image for "${product.product_name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Remove from storage if hosted there
      if (product.product_image) {
        await removeProductImageFromSupabase(product.product_image);
      }

      await onRemoveImage(product.id);
      setCurrentImage(null);
      setStagedNewImage(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove image.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProductsForReassign = allProducts.filter(p => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(reassignSearchQuery.toLowerCase()) ||
      p.product_code.toLowerCase().includes(reassignSearchQuery.toLowerCase());
    const matchesCat = reassignCategory === 'ALL' || p.category === reassignCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span>Product Image Manager</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-mono font-bold">
                  {product.product_code}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {product.product_name} • {product.category} (₱{product.selling_price.toFixed(2)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* VIEW 1: PREVIEW / STANDARD PRODUCT IMAGE VIEW */}
          {view === 'PREVIEW' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center justify-center">
                <div className="w-60 h-60 rounded-3xl bg-zinc-50 border-2 border-zinc-200 overflow-hidden flex items-center justify-center relative shadow-sm group">
                  {stagedNewImage ? (
                    <>
                      <img
                        src={stagedNewImage}
                        alt={targetProduct.product_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                        NEW PHOTO PREVIEW
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={getProductImageWithFallback(currentImage, product.product_name, product.category)}
                        alt={product.product_name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = getFoodSvgForProduct(product.product_name, product.category);
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-[#111111]/80 backdrop-blur-xs text-[#CDEBC5] text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        {currentImage ? 'CURRENT PHOTO' : 'TAGPUAN VECTOR'}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-[#CDEBC5] text-zinc-950 shadow-lg hover:bg-emerald-300 transition text-xs font-black flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{currentImage ? 'Replace with Photo' : 'Upload Camera Photo'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              {stagedNewImage ? (
                /* Immediate preview with direct Save or optional Gemini Vision match */
                <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  <div className="text-xs text-zinc-700 font-medium">
                    New photo staged for: <strong className="text-zinc-950 font-black">{targetProduct.product_name}</strong> ({targetProduct.product_code})
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmSave}
                      disabled={isLoading}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Save Photo Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => analyzeWithGemini(stagedNewImage, stagedMimeType)}
                      disabled={isLoading}
                      className="px-4 py-2.5 bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-[#CDEBC5]" />
                      <span>Verify with Gemini AI</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setView('MANUAL_SELECTION')}
                      className="text-xs text-zinc-600 hover:text-zinc-900 font-bold underline"
                    >
                      Assign to a Different Product...
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStagedNewImage(null);
                        setTargetProduct(product);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ) : (
                /* Management Controls: Upload, Replace, Remove, Change Product Assignment */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2.5 bg-zinc-900 hover:bg-black text-[#CDEBC5] text-xs font-black rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{currentImage ? 'Replace Image' : 'Upload Image'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetProduct(product);
                      setView('REASSIGN_PRODUCT');
                    }}
                    disabled={!currentImage}
                    className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-100 text-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Change Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isLoading || !currentImage}
                    className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Remove Image</span>
                  </button>
                </div>
              )}

              {/* Direct Image URL Input */}
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">
                  Or Paste Direct Image URL (HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/product-image.jpg"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (imageUrlInput.trim()) {
                        setStagedNewImage(imageUrlInput.trim());
                        setStagedMimeType('image/jpeg');
                        setTargetProduct(product);
                      }
                    }}
                    disabled={!imageUrlInput.trim()}
                    className="px-3 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-[#CDEBC5] disabled:opacity-40 rounded-xl transition shrink-0"
                  >
                    Preview URL
                  </button>
                </div>
              </div>

              <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-xs text-zinc-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  All images are synced through central database records and Supabase Storage for seamless Kiosk and POS rendering.
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: GEMINI VISION ANALYZING */}
          {view === 'ANALYZING' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
              {stagedNewImage && (
                <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-zinc-900 shadow-md">
                  <img
                    src={stagedNewImage}
                    alt="Uploaded food"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-900 font-black text-sm">
                <RefreshCw className="w-5 h-5 animate-spin text-[#111111]" />
                <span>Gemini Vision analyzing food photograph...</span>
              </div>
              <p className="text-xs text-zinc-500 max-w-sm">
                Inspecting food plating, ingredients, and recipe attributes against Tagpuan's menu items.
              </p>
            </div>
          )}

          {/* VIEW 3: CONFIRMATION SCREEN (Strict User Requirement) */}
          {view === 'CONFIRM_SUGGESTION' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black">Is this the correct product?</h4>
                    <p className="text-xs text-emerald-800">
                      Gemini Vision identified the product from your uploaded picture.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono text-[11px] font-black tracking-wide shadow-xs">
                    {aiAnalysis?.confidence || 'HIGH'} CONFIDENCE ({aiAnalysis?.confidence_percentage || 85}%)
                  </span>
                </div>
              </div>

              {/* Uploaded picture & suggested product data card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 rounded-3xl p-4 border border-zinc-200">
                {/* Uploaded picture */}
                <div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1.5">
                    Uploaded Picture
                  </span>
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border border-zinc-300 shadow-sm bg-black">
                    {stagedNewImage && (
                      <img
                        src={stagedNewImage}
                        alt="Uploaded food"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Suggested Product Name, Category, Price */}
                <div className="flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      SUGGESTED PRODUCT
                    </span>
                    <h4 className="text-base font-black text-zinc-900 mt-1 leading-snug">
                      {targetProduct.product_name}
                    </h4>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[11px] font-mono font-bold">
                        {targetProduct.product_code}
                      </span>
                      <span className="text-xs text-zinc-600 font-medium">
                        Category: <strong className="text-zinc-800">{targetProduct.category}</strong>
                      </span>
                    </div>

                    <div className="mt-3 bg-white p-2.5 rounded-2xl border border-zinc-200">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Current Price</span>
                      <div className="text-lg font-black text-zinc-900 font-mono">
                        ₱{targetProduct.selling_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Gemini Visual Reasoning */}
                    {aiAnalysis?.visual_reasoning && (
                      <div className="mt-2 text-xs text-zinc-600 bg-zinc-100 p-2.5 rounded-xl border border-zinc-200">
                        <span className="font-bold text-zinc-800 block text-[10px]">Gemini Vision Insight:</span>
                        <p className="italic text-[11px] text-zinc-600 leading-snug">
                          "{aiAnalysis.visual_reasoning}"
                        </p>
                      </div>
                    )}
                  </div>

                  {targetProduct.id !== product.id && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                      <strong>Note:</strong> This photo was identified as <strong>{targetProduct.product_name}</strong> rather than <strong>{product.product_name}</strong>.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: CONFIRM, CANCEL, CHOOSE DIFFERENT PRODUCT */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setView('MANUAL_SELECTION')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl border border-zinc-200 transition"
                >
                  CHOOSE DIFFERENT PRODUCT
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStagedNewImage(null);
                      setView('PREVIEW');
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl transition"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] disabled:bg-zinc-300 rounded-xl shadow transition flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#CDEBC5]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                    )}
                    <span>CONFIRM</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: UNIDENTIFIED / MANUAL PRODUCT SELECTION */}
          {view === 'MANUAL_SELECTION' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black">Product could not be confidently identified</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {aiAnalysis?.visual_reasoning || 'Gemini Vision could not determine the exact menu item. Please select the correct Tagpuan menu product manually:'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Thumbnail Preview */}
              {stagedNewImage && (
                <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-300 shrink-0 bg-black">
                    <img
                      src={stagedNewImage}
                      alt="Uploaded food"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">Target Image</span>
                    <p className="text-xs font-bold text-zinc-800">
                      Select which menu product will use this photo:
                    </p>
                  </div>
                </div>
              )}

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={reassignSearchQuery}
                    onChange={(e) => setReassignSearchQuery(e.target.value)}
                    placeholder="Search menu product name or code..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
                <select
                  value={reassignCategory}
                  onChange={(e) => setReassignCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white font-bold"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product List */}
              <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto rounded-2xl border border-zinc-200 bg-white">
                {filteredProductsForReassign.map((prod) => {
                  const isSelected = targetProduct.id === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setTargetProduct(prod)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-[#CDEBC5]/30 border-l-4 border-l-[#111111]' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                          {prod.product_image ? (
                            <img
                              src={prod.product_image}
                              alt={prod.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-zinc-400 font-bold">No img</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-zinc-100 rounded text-zinc-700">
                              {prod.product_code}
                            </span>
                            <h4 className="text-xs font-extrabold text-zinc-900">{prod.product_name}</h4>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-medium">{prod.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-xs text-zinc-900">
                          ₱{prod.selling_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                        <input
                          type="radio"
                          name="target_manual_selection"
                          checked={isSelected}
                          onChange={() => setTargetProduct(prod)}
                          className="w-4 h-4 text-[#111111] focus:ring-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setStagedNewImage(null);
                    setView('PREVIEW');
                  }}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl transition"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] rounded-xl transition flex items-center gap-2"
                >
                  <span>CONFIRM & SAVE TO {targetProduct.product_name}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW 5: CHANGE PRODUCT ASSIGNMENT (For existing image) */}
          {view === 'REASSIGN_PRODUCT' && (
            <div className="space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <h4 className="text-xs font-black uppercase tracking-wide text-zinc-700 mb-1">
                  Change Product Assignment
                </h4>
                <p className="text-xs text-zinc-500">
                  Select a different menu product in the database to receive this picture.
                  The original product price, recipe, and historical sales remain unchanged.
                </p>
              </div>

              {/* Current photo preview */}
              {currentImage && (
                <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-300 shrink-0 bg-black">
                    <img
                      src={currentImage}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">Current Photo of</span>
                    <p className="text-xs font-black text-zinc-900">{product.product_name}</p>
                    <span className="text-[11px] text-zinc-500 font-medium">Assigning to new item...</span>
                  </div>
                </div>
              )}

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={reassignSearchQuery}
                    onChange={(e) => setReassignSearchQuery(e.target.value)}
                    placeholder="Search target product name or code..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
                <select
                  value={reassignCategory}
                  onChange={(e) => setReassignCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white font-bold"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product List */}
              <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto rounded-2xl border border-zinc-200 bg-white">
                {filteredProductsForReassign.map((prod) => {
                  const isSelected = targetProduct.id === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setTargetProduct(prod)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-[#CDEBC5]/30 border-l-4 border-l-[#111111]' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                          {prod.product_image ? (
                            <img
                              src={prod.product_image}
                              alt={prod.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-zinc-400 font-bold">No img</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-zinc-100 rounded text-zinc-700">
                              {prod.product_code}
                            </span>
                            <h4 className="text-xs font-extrabold text-zinc-900">{prod.product_name}</h4>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-medium">{prod.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-xs text-zinc-900">
                          ₱{prod.selling_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                        <input
                          type="radio"
                          name="target_reassign_selection"
                          checked={isSelected}
                          onChange={() => setTargetProduct(prod)}
                          className="w-4 h-4 text-[#111111] focus:ring-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setView('PREVIEW')}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl transition"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentImage) return;
                    try {
                      setIsLoading(true);
                      await api.reassignProductImage(product.id, targetProduct.id, currentImage, false);
                      onClose();
                    } catch (err: any) {
                      setErrorMessage(err.message || 'Failed to reassign image.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading || targetProduct.id === product.id}
                  className="px-6 py-2.5 text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] disabled:bg-zinc-200 disabled:text-zinc-400 rounded-xl transition flex items-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>REASSIGN TO {targetProduct.product_name}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
