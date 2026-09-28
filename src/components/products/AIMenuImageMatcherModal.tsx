import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Tag,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ImageIcon
} from 'lucide-react';
import { Product, AIMatchImageResponse, AIMatchAlternative } from '../../types/index';
import { api } from '../../lib/api';
import { uploadProductImageToSupabase } from '../../lib/supabase';

interface AIMenuImageMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductUpdated: () => void;
  onShowNotification: (msg: string) => void;
}

type MatchStep = 'UPLOAD' | 'ANALYZING' | 'CONFIRM' | 'MANUAL_SELECT' | 'SUCCESS';

export const AIMenuImageMatcherModal: React.FC<AIMenuImageMatcherModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductUpdated,
  onShowNotification
}) => {
  const [step, setStep] = useState<MatchStep>('UPLOAD');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [analysisResult, setAnalysisResult] = useState<AIMatchImageResponse | null>(null);
  const [selectedTargetProduct, setSelectedTargetProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('File size is too large (maximum 8MB).');
      return;
    }

    setErrorMessage(null);
    setMimeType(file.type || 'image/jpeg');

    // Read and optimize image via canvas
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
          setUploadedImagePreview(dataUrl);
          // Auto-trigger Gemini analysis
          runGeminiAnalysis(dataUrl, 'image/jpeg');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const runGeminiAnalysis = async (imageData: string, mime: string) => {
    try {
      setStep('ANALYZING');
      setErrorMessage(null);
      const res = await api.aiMatchProductImage(imageData, mime);
      setAnalysisResult(res);

      if (res.identified && res.product) {
        setSelectedTargetProduct(res.product);
        setStep('CONFIRM');
      } else {
        setSelectedTargetProduct(null);
        setStep('MANUAL_SELECT');
      }
    } catch (err: any) {
      console.error('[AI Matcher] Gemini Vision error:', err);
      setErrorMessage(err.message || 'Failed to analyze image with Gemini.');
      setStep('MANUAL_SELECT');
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedTargetProduct || !uploadedImagePreview) {
      setErrorMessage('Please select a product to assign this photo.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // 1. Upload to Supabase Storage in 'product-images' bucket
      const storagePublicUrl = await uploadProductImageToSupabase(
        uploadedImagePreview,
        selectedTargetProduct.id
      );

      // 2. Save image reference to central product record
      await api.uploadProductImage(selectedTargetProduct.id, storagePublicUrl);

      // 3. Notify and trigger update
      onShowNotification(`Photo successfully matched and assigned to "${selectedTargetProduct.product_name}".`);
      onProductUpdated();
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('[AI Matcher] Failed to save product image:', err);
      setErrorMessage(err.message || 'Failed to save product image to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForNextPhoto = () => {
    setUploadedImagePreview(null);
    setAnalysisResult(null);
    setSelectedTargetProduct(null);
    setErrorMessage(null);
    setSearchQuery('');
    setStep('UPLOAD');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span>Gemini Vision Menu Photo Matcher</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase">
                  AI Multimodal
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Analyze uploaded food pictures and automatically match to Tagpuan menu items
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD SCREEN */}
          {step === 'UPLOAD' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 hover:border-[#111111] rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition bg-zinc-50 hover:bg-zinc-100/60 flex flex-col items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-sm font-extrabold text-zinc-900 mb-1">
                  Click or drag food photograph here
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Upload a photo of any Tagpuan burger, fries, rice meal, specialty combo, or beverage.
                  Gemini Vision will automatically identify the item.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200/70 text-zinc-700 text-[11px] font-mono font-medium">
                  PNG, JPG, WEBP up to 8MB
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 text-xs text-zinc-600 space-y-1.5">
                <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Authoritative Database Guarantee</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Gemini analyzes visual food characteristics (beef patties, buns, OK cheese, fries seasoning, siomai, lumpia shanghai, fried egg, meatloaf).
                  It will <strong>never invent products, overwrite prices, or alter recipes</strong>. The database is the sole source of truth.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING STATE */}
          {step === 'ANALYZING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              {uploadedImagePreview && (
                <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-[#111111] shadow-lg relative mb-2 animate-pulse">
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded food"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm">
                <RefreshCw className="w-5 h-5 animate-spin text-[#111111]" />
                <span>Gemini Vision analyzing food photograph...</span>
              </div>
              <p className="text-xs text-zinc-500 max-w-md">
                Comparing visual components against the Tagpuan menu database (Burgers, Fries, Favourite Rice, Classic, Specialty combos, and Drinks).
              </p>
            </div>
          )}

          {/* STEP 3: CONFIRMATION SCREEN (Strict User Requirement) */}
          {step === 'CONFIRM' && selectedTargetProduct && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-black">Is this the correct product?</h3>
                    <p className="text-xs text-emerald-800">
                      Gemini Vision identified a match with the existing Tagpuan menu database.
                    </p>
                  </div>
                </div>
                {/* Confidence Level Badge */}
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono text-[11px] font-black tracking-wide shadow-xs">
                    {analysisResult?.confidence || 'HIGH'} CONFIDENCE ({analysisResult?.confidence_percentage || 90}%)
                  </span>
                </div>
              </div>

              {/* Product Match Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 rounded-3xl p-4 border border-zinc-200">
                {/* Uploaded Picture Display */}
                <div>
                  <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
                    <span>Uploaded Picture</span>
                    <button
                      type="button"
                      onClick={handleResetForNextPhoto}
                      className="text-zinc-600 hover:text-black text-[10px] underline"
                    >
                      Change photo
                    </button>
                  </div>
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border border-zinc-300 shadow-sm bg-black">
                    {uploadedImagePreview ? (
                      <img
                        src={uploadedImagePreview}
                        alt="Uploaded food"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggested Product Database Details */}
                <div className="flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      MATCHED DATABASE ITEM
                    </span>

                    {/* Product Name */}
                    <h4 className="text-lg font-black text-zinc-900 mt-1 leading-snug">
                      {selectedTargetProduct.product_name}
                    </h4>

                    {/* Category & Code */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[11px] font-mono font-bold">
                        {selectedTargetProduct.product_code}
                      </span>
                      <span className="text-xs text-zinc-600 font-medium">
                        Category: <strong className="text-zinc-800">{selectedTargetProduct.category}</strong>
                      </span>
                    </div>

                    {/* Current Price */}
                    <div className="mt-3 bg-white p-3 rounded-2xl border border-zinc-200">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Current Database Price</span>
                      <div className="text-xl font-black text-zinc-900 font-mono">
                        ₱{selectedTargetProduct.selling_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Visual Reasoning from Gemini */}
                    {analysisResult?.visual_reasoning && (
                      <div className="mt-3 text-xs text-zinc-600 bg-zinc-100 p-2.5 rounded-xl border border-zinc-200">
                        <span className="font-bold text-zinc-800 block text-[11px] mb-0.5">Gemini Visual Reasoning:</span>
                        <p className="italic text-[11px] text-zinc-600 leading-relaxed">
                          "{analysisResult.visual_reasoning}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Alternative suggestions if available */}
                  {analysisResult?.alternatives && analysisResult.alternatives.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                        Alternative Candidates:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.alternatives.map((alt, idx) => {
                          const altProd = products.find(p => p.id === alt.product_id || p.product_code === alt.product_code);
                          if (!altProd) return null;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedTargetProduct(altProd)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-[11px] font-medium text-zinc-700 hover:border-[#111111] hover:text-black transition flex items-center gap-1"
                            >
                              <span>{alt.product_name}</span>
                              <span className="text-[10px] font-mono text-zinc-400">({alt.confidence_percentage}%)</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons as specified in User Request: CONFIRM, CANCEL, CHOOSE DIFFERENT PRODUCT */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setStep('MANUAL_SELECT')}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-extrabold text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl border border-zinc-200 transition text-center"
                >
                  CHOOSE DIFFERENT PRODUCT
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl transition text-center"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAssignment}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] disabled:bg-zinc-300 disabled:text-zinc-500 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#CDEBC5]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                    )}
                    <span>CONFIRM & SAVE IMAGE</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: UNIDENTIFIED / MANUAL PRODUCT SELECTOR */}
          {step === 'MANUAL_SELECT' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black">Product could not be confidently identified</h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {analysisResult?.visual_reasoning || 'Gemini Vision could not identify a certain match. Please select the correct Tagpuan menu item from the database below:'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Image Thumbnail Preview */}
              {uploadedImagePreview && (
                <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-300 shrink-0 bg-black">
                    <img
                      src={uploadedImagePreview}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu product name or code (e.g. Cheese Burger, F1, S1)..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
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
              <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto rounded-2xl border border-zinc-200 bg-white">
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs font-medium">
                    No matching products found in database.
                  </div>
                ) : (
                  filteredProducts.map((prod) => {
                    const isSelected = selectedTargetProduct?.id === prod.id;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedTargetProduct(prod)}
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
                            name="target_product_selection"
                            checked={isSelected}
                            onChange={() => setSelectedTargetProduct(prod)}
                            className="w-4 h-4 text-[#111111] focus:ring-0"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Confirmation Controls */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl transition"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTargetProduct) {
                      setStep('CONFIRM');
                    }
                  }}
                  disabled={!selectedTargetProduct}
                  className="px-6 py-2.5 text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] disabled:bg-zinc-200 disabled:text-zinc-400 rounded-xl transition flex items-center gap-2"
                >
                  <span>PROCEED WITH SELECTED PRODUCT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS STATE */}
          {step === 'SUCCESS' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  Image Successfully Saved!
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  The photo reference is now saved to Supabase Storage and stored in the central product record for <strong>{selectedTargetProduct?.product_name}</strong>.
                  It will now appear across POS, Customer Kiosk, and KDS orders.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForNextPhoto}
                  className="px-4 py-2.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Match Another Photo</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] rounded-xl transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
