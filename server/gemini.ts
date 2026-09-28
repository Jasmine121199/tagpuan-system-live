import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../src/types/index";

export interface FoodAnalysisResult {
  identified: boolean;
  matched_product_code: string | null;
  matched_product_name: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
  confidence_percentage: number;
  visual_reasoning: string;
  alternatives: {
    product_code: string;
    product_name: string;
    confidence_percentage: number;
  }[];
}

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (!geminiClient) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (err) {
      console.warn('[Gemini] Failed to initialize GoogleGenAI client:', err);
      return null;
    }
  }
  return geminiClient;
}

/**
 * Analyzes an uploaded food photo using Gemini Vision against the authoritative
 * Tagpuan menu catalog.
 */
export async function analyzeFoodImageWithGemini(
  imageData: string,
  mimeType: string = 'image/jpeg',
  catalog: Product[]
): Promise<FoodAnalysisResult> {
  const ai = getGeminiClient();

  // Clean base64 string
  let base64Clean = imageData;
  if (base64Clean.includes('base64,')) {
    const parts = base64Clean.split('base64,');
    base64Clean = parts[1];
    const mimeMatch = parts[0].match(/data:(.*?);/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
  }

  // Format existing product database items for prompt
  const catalogSummary = catalog.map(p => ({
    code: p.product_code,
    name: p.product_name,
    category: p.category,
    price: `₱${p.selling_price}`,
    description: p.description || ''
  }));

  if (!ai) {
    console.warn('[Gemini Vision] GEMINI_API_KEY not configured. Falling back to manual assignment workflow.');
    return {
      identified: false,
      matched_product_code: null,
      matched_product_name: null,
      confidence: 'UNCERTAIN',
      confidence_percentage: 0,
      visual_reasoning: 'Product could not be confidently identified because AI Vision service is not configured. Please select the correct product manually.',
      alternatives: []
    };
  }

  const systemInstruction = `You are the expert food vision analysis engine for Tagpuan - Home of Authentic Burger & Siomai.
Your job is to visually inspect photographs of food dishes and determine which exact Tagpuan menu product is shown.

CRITICAL RULES:
1. You must STRICTLY match against the provided Tagpuan menu catalog.
2. NEVER invent new products, alter prices, change names, or create ingredients.
3. If the photo clearly depicts a specific Tagpuan menu item, identify it with HIGH or MEDIUM confidence.
4. If the photo is ambiguous, blurry, not food, or could be multiple items without clear distinction, set "identified" to false, "matched_product_code" to "", and confidence to "UNCERTAIN" or "LOW".

TAGPUAN MENU VISUAL RULES:
- Plain Burger (BUR-01): Classic grilled beef patty in toasted sesame bun, with signature burger sauce, WITHOUT any cheese.
- Cheese Burger (BUR-03): Grilled beef patty with a slice of melted yellow cheese in toasted sesame bun.
- Cheese Burger with Fries (BUR-08): Cheese burger plated or served alongside french fries.
- Burger Overload (BUR-05): Thick loaded burger with special toppings or double elements.
- Cheese Overload (BUR-07): Extra cheese dripping or double cheese layers.
- Buy 1 Take 1 Cheese Burger with Softdrinks (BUR-06): Two cheese burgers shown or accompanied by a softdrink.
- Double Cheese Fries (FRIES-01, FRIES-02, FRIES-03): French fries coated in cheese powder seasoning (or BBQ/sour cream).
- F1 Siomai Rice (FAV-01): Pork or beef dumplings (siomai) with fried rice/plain rice and chili garlic soy dip.
- F2 Egg Rice (FAV-02): Sunny-side-up fried egg with rice.
- F3 Shanghai Rice (FAV-03): Crispy fried lumpia Shanghai rolls with rice.
- F4 Patty Rice (FAV-04): Burger patty with savory sauce/gravy served with rice.
- C1 Shanghai, Siomai, Egg & Rice (CLS-01): 4 items on plate: Shanghai rolls, Siomai, Fried Egg, Rice.
- C2 Siomai, Meatloaf, Egg & Rice (CLS-02): 4 items: Siomai, Sliced Meatloaf, Fried Egg, Rice.
- C3 Patty, Meatloaf, Egg & Rice (CLS-03): 4 items: Beef Patty, Meatloaf, Fried Egg, Rice.
- C4 Shanghai, Meatloaf, Egg & Rice (CLS-04): 4 items: Shanghai rolls, Meatloaf, Fried Egg, Rice.
- S1 Shanghai, Siomai, Egg, Meatloaf & Rice (SPC-01): Specialty combo with 5 items: Shanghai, Siomai, Egg, Meatloaf, Rice.
- S2 Patty, Siomai, Egg, Meatloaf & Rice (SPC-02): 5 items: Patty, Siomai, Egg, Meatloaf, Rice.
- S3 Patty, Shanghai, Egg, Siomai & Rice (SPC-03): 5 items: Patty, Shanghai, Egg, Siomai, Rice.
- S4 Hotdog, Shanghai, Egg, Meatloaf & Rice (SPC-04): 5 items: Hotdog, Shanghai, Egg, Meatloaf, Rice.
- DRINKS: Softdrinks (DRK-02, bottled/canned soda like Coke/Sprite), Red Iced Tea (DRK-01, deep red iced drink), Coffee (DRK-03, cup of coffee).
- ADD-ONS: Individual single pieces (Single Siomai, Patty, Egg, Cheese slice, Shanghai, Meatloaf, Hotdog, Rice).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Here is the current Tagpuan menu database:\n${JSON.stringify(catalogSummary, null, 2)}\n\nPlease analyze this uploaded food photo and identify the matching Tagpuan menu product:`
            },
            {
              inlineData: {
                mimeType,
                data: base64Clean
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identified: { type: Type.BOOLEAN },
            matched_product_code: { type: Type.STRING },
            matched_product_name: { type: Type.STRING },
            confidence: { type: Type.STRING },
            confidence_percentage: { type: Type.INTEGER },
            visual_reasoning: { type: Type.STRING },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  product_code: { type: Type.STRING },
                  product_name: { type: Type.STRING },
                  confidence_percentage: { type: Type.INTEGER }
                },
                required: ['product_code', 'product_name', 'confidence_percentage']
              }
            }
          },
          required: [
            'identified',
            'matched_product_code',
            'matched_product_name',
            'confidence',
            'confidence_percentage',
            'visual_reasoning'
          ]
        }
      }
    });

    const rawText = response.text?.trim() || '';
    const parsed = JSON.parse(rawText);

    const isIdentified = Boolean(
      parsed.identified &&
      parsed.matched_product_code &&
      parsed.matched_product_code.trim().length > 0 &&
      parsed.confidence !== 'UNCERTAIN' &&
      (parsed.confidence_percentage ?? 0) >= 50
    );

    return {
      identified: isIdentified,
      matched_product_code: isIdentified ? parsed.matched_product_code.trim() : null,
      matched_product_name: isIdentified ? parsed.matched_product_name.trim() : null,
      confidence: parsed.confidence || (isIdentified ? 'HIGH' : 'UNCERTAIN'),
      confidence_percentage: typeof parsed.confidence_percentage === 'number' ? parsed.confidence_percentage : (isIdentified ? 85 : 30),
      visual_reasoning: parsed.visual_reasoning || (isIdentified ? 'Visual match found.' : 'Product could not be confidently identified.'),
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : []
    };
  } catch (err: any) {
    console.error('[Gemini Vision] Error during multimodal generateContent:', err);
    return {
      identified: false,
      matched_product_code: null,
      matched_product_name: null,
      confidence: 'UNCERTAIN',
      confidence_percentage: 0,
      visual_reasoning: `Product could not be confidently identified (${err.message || 'Vision analysis error'}). Please select manually.`,
      alternatives: []
    };
  }
}
