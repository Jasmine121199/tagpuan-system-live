// Authoritative inline SVG Food Illustrations for Tagpuan ERP
// Standalone, self-contained data URIs with zero network dependencies

const encodeSvg = (svgString: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim().replace(/\n\s+/g, ' '))}`;
};

// 1. Classic Flame-Grilled Cheese Burger (Melting golden cheese, grilled patty, sesame bun)
export const SVG_BURGER_CHEESE = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#2a140a"/>
      <stop offset="100%" stop-color="#0f0703"/>
    </radialGradient>
    <linearGradient id="topBun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="60%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="patty" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5c2b16"/>
      <stop offset="50%" stop-color="#451a03"/>
      <stop offset="100%" stop-color="#2d0f02"/>
    </linearGradient>
    <linearGradient id="cheese" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#bgGlow)"/>
  <ellipse cx="200" cy="250" rx="140" ry="24" fill="#000000" opacity="0.45"/>
  <g transform="translate(40, 30)">
    <!-- Bottom Bun -->
    <ellipse cx="160" cy="188" rx="120" ry="34" fill="url(#topBun)"/>
    <path d="M 40,188 Q 160,210 280,188 Q 284,204 270,214 Q 160,230 50,214 Z" fill="#92400e"/>
    <!-- Grilled Beef Patty -->
    <rect x="36" y="152" width="248" height="38" rx="18" fill="url(#patty)"/>
    <ellipse cx="160" cy="162" rx="122" ry="12" fill="#78350f" opacity="0.6"/>
    <!-- Melting Melted Cheese Slice with Dripping Corners -->
    <path d="M 38,150 L 282,150 L 260,186 L 220,158 L 180,195 L 140,158 L 95,190 L 58,158 Z" fill="url(#cheese)"/>
    <!-- Tomato Slice & Lettuce Highlights -->
    <path d="M 52,145 Q 160,135 268,145 Q 262,152 250,152 Q 160,142 66,152 Z" fill="#ef4444"/>
    <path d="M 50,140 Q 90,132 120,140 Q 150,132 180,140 Q 220,132 270,140 Q 250,132 210,134 Q 160,128 110,134 Z" fill="#22c55e"/>
    <!-- Golden Top Bun -->
    <path d="M 42,138 C 42,42 278,42 278,138 Z" fill="url(#topBun)"/>
    <path d="M 60,120 C 70,62 250,62 260,120 C 240,78 80,78 60,120 Z" fill="#fbbf24" opacity="0.35"/>
    <!-- Sesame Seeds -->
    <ellipse cx="110" cy="80" rx="5" ry="3" fill="#fef08a"/>
    <ellipse cx="160" cy="65" rx="5" ry="3" fill="#fef08a"/>
    <ellipse cx="210" cy="78" rx="5" ry="3" fill="#fef08a"/>
    <ellipse cx="135" cy="100" rx="5" ry="3" fill="#fef08a"/>
    <ellipse cx="185" cy="98" rx="5" ry="3" fill="#fef08a"/>
    <ellipse cx="85" cy="105" rx="5" ry="3" fill="#fef08a"/>
    <ellipse cx="235" cy="102" rx="5" ry="3" fill="#fef08a"/>
  </g>
</svg>
`);

// 2. Overload Double Cheese Burger (Tower of 2 patties, fried egg, and thick cascading cheese)
export const SVG_BURGER_OVERLOAD = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <radialGradient id="bgOverload" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#3d1303"/>
      <stop offset="100%" stop-color="#120501"/>
    </radialGradient>
    <linearGradient id="bunGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#bgOverload)"/>
  <ellipse cx="200" cy="265" rx="145" ry="22" fill="#000" opacity="0.5"/>
  <g transform="translate(50, 15)">
    <!-- Bottom Bun -->
    <ellipse cx="150" cy="225" rx="115" ry="30" fill="url(#bunGrad)"/>
    <!-- Lower Patty -->
    <rect x="42" y="195" width="216" height="30" rx="15" fill="#451a03"/>
    <!-- Lower Cheese -->
    <path d="M 44,195 L 256,195 L 240,225 L 205,200 L 170,228 L 130,198 L 85,225 Z" fill="#fbbf24"/>
    <!-- Fried Egg -->
    <ellipse cx="150" cy="180" rx="100" ry="16" fill="#f8fafc"/>
    <circle cx="150" cy="178" r="18" fill="#f59e0b"/>
    <!-- Upper Patty -->
    <rect x="44" y="145" width="212" height="30" rx="15" fill="#3f1704"/>
    <!-- Cascading Cheese Sauce Waterfall -->
    <path d="M 40,145 Q 60,230 75,150 Q 95,245 115,150 Q 140,250 160,150 Q 185,240 205,150 Q 230,225 258,145 Z" fill="#f59e0b"/>
    <path d="M 50,145 Q 70,220 82,150 Q 105,235 120,150 Q 145,240 165,150 Q 190,230 210,150 Z" fill="#fde047" opacity="0.85"/>
    <!-- Top Brioche Bun -->
    <path d="M 46,140 C 46,40 254,40 254,140 Z" fill="url(#bunGrad)"/>
    <ellipse cx="105" cy="85" rx="4.5" ry="2.5" fill="#fef08a"/>
    <ellipse cx="150" cy="70" rx="4.5" ry="2.5" fill="#fef08a"/>
    <ellipse cx="195" cy="85" rx="4.5" ry="2.5" fill="#fef08a"/>
    <ellipse cx="125" cy="105" rx="4.5" ry="2.5" fill="#fef08a"/>
    <ellipse cx="175" cy="105" rx="4.5" ry="2.5" fill="#fef08a"/>
  </g>
</svg>
`);

// 3. Burger with Soda Bottle / Beverage Combo
export const SVG_BURGER_DRINK = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" rx="16" fill="#180b03"/>
  <!-- Bottle in Background (Mountain Dew style green bottle) -->
  <g transform="translate(265, 30)">
    <rect x="24" y="6" width="22" height="12" rx="3" fill="#15803d"/>
    <rect x="27" y="18" width="16" height="8" fill="#166534"/>
    <path d="M 22,40 Q 22,25 35,25 Q 48,25 48,40 L 52,90 L 56,200 Q 56,220 35,220 Q 14,220 14,200 L 18,90 Z" fill="#22c55e"/>
    <rect x="15" y="105" width="40" height="55" rx="4" fill="#dc2626"/>
    <polygon points="20,135 48,122 45,148 22,154" fill="#facc15"/>
    <line x1="22" y1="45" x2="22" y2="200" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.45"/>
  </g>
  <!-- Burger in Foreground -->
  <g transform="translate(25, 65)">
    <ellipse cx="130" cy="180" rx="100" ry="28" fill="#d97706"/>
    <rect x="35" y="148" width="190" height="32" rx="16" fill="#451a03"/>
    <path d="M 38,146 L 222,146 L 205,175 L 175,152 L 145,182 L 115,152 L 80,178 L 48,152 Z" fill="#fbbf24"/>
    <ellipse cx="130" cy="138" rx="86" ry="12" fill="#f8fafc"/>
    <circle cx="132" cy="136" r="14" fill="#f59e0b"/>
    <path d="M 38,132 C 38,45 222,45 222,132 Z" fill="#f59e0b"/>
    <ellipse cx="90" cy="85" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="130" cy="72" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="170" cy="85" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="110" cy="105" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="150" cy="102" rx="4" ry="2" fill="#fef08a"/>
  </g>
</svg>
`);

// 4. Buy 1 Take 1 Burgers (Two savory burgers paired side-by-side)
export const SVG_B1T1_BURGERS = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <radialGradient id="b1t1Glow" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#401402"/>
      <stop offset="100%" stop-color="#140601"/>
    </radialGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#b1t1Glow)"/>
  <!-- Left Burger -->
  <g transform="translate(30, 75) scale(0.9)">
    <ellipse cx="110" cy="160" rx="90" ry="26" fill="#d97706"/>
    <rect x="25" y="132" width="170" height="30" rx="15" fill="#451a03"/>
    <path d="M 28,130 L 192,130 L 175,155 L 145,134 L 120,158 L 95,134 L 60,156 Z" fill="#fbbf24"/>
    <path d="M 28,125 C 28,45 192,45 192,125 Z" fill="#f59e0b"/>
    <ellipse cx="80" cy="75" rx="3.5" ry="2" fill="#fef08a"/>
    <ellipse cx="120" cy="65" rx="3.5" ry="2" fill="#fef08a"/>
    <ellipse cx="150" cy="78" rx="3.5" ry="2" fill="#fef08a"/>
  </g>
  <!-- Right Burger (Front) -->
  <g transform="translate(160, 95)">
    <ellipse cx="115" cy="160" rx="95" ry="28" fill="#d97706"/>
    <rect x="25" y="130" width="180" height="32" rx="16" fill="#3f1704"/>
    <path d="M 28,128 L 202,128 L 185,158 L 150,132 L 120,162 L 90,132 L 55,160 Z" fill="#fbbf24"/>
    <path d="M 28,122 C 28,35 202,35 202,122 Z" fill="#f59e0b"/>
    <ellipse cx="75" cy="70" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="115" cy="58" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="155" cy="72" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="95" cy="92" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="135" cy="90" rx="4" ry="2" fill="#fef08a"/>
  </g>
</svg>
`);

// 5. Classic Rice Meal Plate (Silog Style with Sunny Egg, Luncheon Meat, Shanghai, and Garlic Rice)
export const SVG_SILOG_PLATE = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="plateWood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#241910"/>
      <stop offset="100%" stop-color="#120c08"/>
    </linearGradient>
    <linearGradient id="luncheon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#be123c"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#plateWood)"/>
  <!-- White Modern Coupe Serving Plate -->
  <rect x="40" y="25" width="320" height="250" rx="28" fill="#f8fafc" stroke="#e2e8f0" stroke-width="6"/>
  
  <!-- Steaming Mound of Garlic Rice -->
  <g transform="translate(195, 145)">
    <circle cx="0" cy="0" r="52" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5"/>
    <circle cx="-8" cy="-8" r="4" fill="#b45309"/>
    <circle cx="6" cy="-4" r="3.5" fill="#d97706"/>
    <circle cx="-3" cy="8" r="4" fill="#92400e"/>
    <circle cx="10" cy="10" r="3" fill="#b45309"/>
  </g>

  <!-- Pan-Fried Luncheon Meat Slice (Top Left) -->
  <g transform="translate(68, 52) rotate(-8)">
    <rect width="80" height="52" rx="8" fill="url(#luncheon)" stroke="#701a75" stroke-width="2"/>
    <line x1="12" y1="16" x2="68" y2="16" stroke="#fb7185" stroke-width="2.5" opacity="0.65"/>
    <line x1="12" y1="32" x2="68" y2="32" stroke="#fb7185" stroke-width="2.5" opacity="0.65"/>
  </g>

  <!-- Sunny-Side Up Fried Egg (Top Right) -->
  <g transform="translate(285, 80)">
    <ellipse cx="0" cy="0" rx="42" ry="32" fill="#ffffff" stroke="#fef08a" stroke-width="2.5"/>
    <circle cx="3" cy="-2" r="18" fill="#f59e0b"/>
    <circle cx="0" cy="-5" r="5" fill="#ffffff" opacity="0.7"/>
  </g>

  <!-- Crispy Shanghai Spring Rolls (Bottom Right) -->
  <g transform="translate(270, 175)">
    <rect x="0" y="0" width="70" height="18" rx="9" fill="#d97706" transform="rotate(-18)"/>
    <rect x="10" y="24" width="70" height="18" rx="9" fill="#b45309" transform="rotate(-18)"/>
    <rect x="20" y="48" width="70" height="18" rx="9" fill="#d97706" transform="rotate(-18)"/>
  </g>

  <!-- Toyomansi Dipping Sauce with Calamansi & Sili (Bottom Left) -->
  <g transform="translate(85, 180)">
    <ellipse cx="25" cy="25" rx="28" ry="20" fill="#09090b"/>
    <circle cx="18" cy="22" r="9" fill="#65a30d"/>
    <circle cx="18" cy="22" r="6" fill="#84cc16"/>
    <path d="M 32,32 Q 42,22 46,14" stroke="#ef4444" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
</svg>
`);

// 6. Dimsum Siomai Dumplings (Golden steamed/fried pork siomai with chili garlic)
export const SVG_SIOMAI_PLATE = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" rx="16" fill="#1c1209"/>
  <ellipse cx="200" cy="260" rx="160" ry="25" fill="#000" opacity="0.4"/>
  <!-- Steamer / Ceramic Dish -->
  <rect x="45" y="35" width="310" height="230" rx="24" fill="#f8fafc" stroke="#e2e8f0" stroke-width="5"/>
  
  <!-- 4 Siomai Dumplings with Chili Garlic topping -->
  <g transform="translate(100, 75)">
    <rect x="0" y="0" width="48" height="44" rx="12" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
    <circle cx="24" cy="14" r="8" fill="#dc2626"/>
    <circle cx="24" cy="14" r="4" fill="#7f1d1d"/>
  </g>

  <g transform="translate(210, 75)">
    <rect x="0" y="0" width="48" height="44" rx="12" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
    <circle cx="24" cy="14" r="8" fill="#dc2626"/>
    <circle cx="24" cy="14" r="4" fill="#7f1d1d"/>
  </g>

  <g transform="translate(100, 145)">
    <rect x="0" y="0" width="48" height="44" rx="12" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
    <circle cx="24" cy="14" r="8" fill="#dc2626"/>
    <circle cx="24" cy="14" r="4" fill="#7f1d1d"/>
  </g>

  <g transform="translate(210, 145)">
    <rect x="0" y="0" width="48" height="44" rx="12" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
    <circle cx="24" cy="14" r="8" fill="#dc2626"/>
    <circle cx="24" cy="14" r="4" fill="#7f1d1d"/>
  </g>

  <!-- Garlic & Chili Sauce Dipping Dish -->
  <g transform="translate(170, 205)">
    <ellipse cx="30" cy="20" rx="36" ry="18" fill="#0f172a"/>
    <circle cx="24" cy="18" r="8" fill="#84cc16"/>
    <circle cx="38" cy="20" r="5" fill="#ef4444"/>
  </g>
</svg>
`);

// 7. Golden French Fries with Melted Cheese Dip
export const SVG_FRIES_CHEESE = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" rx="16" fill="#180e06"/>
  <!-- Fries in Red Cup / Carton -->
  <g transform="translate(100, 50)">
    <!-- Crispy Golden Potato Fries -->
    <rect x="40" y="10" width="16" height="110" rx="4" fill="#eab308" transform="rotate(-25 40 10)"/>
    <rect x="75" y="15" width="16" height="115" rx="4" fill="#facc15" transform="rotate(-12 75 15)"/>
    <rect x="110" y="8" width="16" height="120" rx="4" fill="#eab308" transform="rotate(4 110 8)"/>
    <rect x="145" y="15" width="16" height="115" rx="4" fill="#facc15" transform="rotate(18 145 15)"/>
    <rect x="175" y="25" width="16" height="105" rx="4" fill="#fde047" transform="rotate(32 175 25)"/>
    <!-- Overlaid Crispy Sticks -->
    <rect x="60" y="30" width="16" height="100" rx="4" fill="#fde047" transform="rotate(-8 60 30)"/>
    <rect x="130" y="28" width="16" height="100" rx="4" fill="#eab308" transform="rotate(10 130 28)"/>
    <!-- Red Tagpuan Fries Carton -->
    <polygon points="35,115 175,115 155,225 55,225" fill="#dc2626"/>
    <polygon points="35,115 175,115 170,128 40,128" fill="#b91c1c"/>
    <circle cx="105" cy="170" r="22" fill="#ffffff"/>
    <text x="105" y="176" fill="#dc2626" font-size="16" font-family="sans-serif" font-weight="900" text-anchor="middle">T</text>
  </g>
  <!-- Melted Golden Cheese Dip Bowl -->
  <g transform="translate(250, 160)">
    <ellipse cx="35" cy="20" rx="35" ry="14" fill="#fbbf24"/>
    <path d="M 0,20 L 8,60 Q 35,70 62,60 L 70,20 Z" fill="#f1f5f9"/>
    <ellipse cx="35" cy="20" rx="30" ry="10" fill="#f59e0b"/>
  </g>
</svg>
`);

// 8. Hotdog Sandwich with Mayo & Ketchup
export const SVG_HOTDOG = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" rx="16" fill="#1c0f05"/>
  <g transform="translate(50, 85) rotate(-5)">
    <!-- Soft Bun -->
    <rect x="25" y="35" width="280" height="85" rx="42" fill="#d97706"/>
    <rect x="25" y="35" width="280" height="60" rx="30" fill="#f59e0b"/>
    <!-- Tender Red Hotdog -->
    <rect x="15" y="52" width="300" height="48" rx="24" fill="#dc2626"/>
    <rect x="15" y="60" width="300" height="32" rx="16" fill="#b91c1c"/>
    <!-- Zigzag Mayonnaise -->
    <path d="M 35,72 Q 60,50 85,72 T 135,72 T 185,72 T 235,72 T 285,72" fill="none" stroke="#fef08a" stroke-width="8" stroke-linecap="round"/>
    <!-- Zigzag Sweet Ketchup -->
    <path d="M 35,78 Q 60,98 85,78 T 135,78 T 185,78 T 235,78 T 285,78" fill="none" stroke="#7f1d1d" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>
`);

// 9. Breakfast Egg Sandwich
export const SVG_EGG_SANDWICH = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" rx="16" fill="#170c04"/>
  <g transform="translate(60, 60)">
    <ellipse cx="140" cy="165" rx="115" ry="32" fill="#d97706"/>
    <!-- Fluffy Golden Egg Patty -->
    <ellipse cx="140" cy="135" rx="110" ry="24" fill="#fef08a"/>
    <ellipse cx="140" cy="132" rx="100" ry="18" fill="#facc15"/>
    <ellipse cx="150" cy="128" rx="40" ry="14" fill="#f59e0b"/>
    <!-- Top Toasted Bun -->
    <path d="M 25,125 C 25,25 255,25 255,125 Z" fill="#f59e0b"/>
    <ellipse cx="90" cy="70" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="140" cy="55" rx="4" ry="2" fill="#fef08a"/>
    <ellipse cx="190" cy="70" rx="4" ry="2" fill="#fef08a"/>
  </g>
</svg>
`);

// 10. Chilled Beverage / Refreshing Cold Drink
export const SVG_DRINK_BEVERAGE = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" rx="16" fill="#0f172a"/>
  <g transform="translate(140, 30)">
    <!-- Red & White Striped Straw -->
    <line x1="50" y1="5" x2="35" y2="80" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/>
    <line x1="50" y1="5" x2="70" y2="-15" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/>
    <!-- Frosted Cup -->
    <polygon points="15,50 85,50 72,220 28,220" fill="#ea580c" opacity="0.9"/>
    <polygon points="12,45 88,45 76,225 24,225" fill="none" stroke="#fed7aa" stroke-width="4" opacity="0.8"/>
    <!-- Ice Cubes inside -->
    <rect x="32" y="75" width="22" height="22" rx="4" fill="#ffffff" opacity="0.6"/>
    <rect x="44" y="110" width="20" height="20" rx="4" fill="#ffffff" opacity="0.5"/>
    <!-- Lemon Wheel on Rim -->
    <circle cx="82" cy="50" r="18" fill="#facc15"/>
    <circle cx="82" cy="50" r="14" fill="#fef08a"/>
  </g>
</svg>
`);

/**
 * Maps any product name and category to its matching crisp, stylized SVG graphic
 */
export function getFoodSvgForProduct(productName?: string, category?: string): string {
  const name = (productName || '').toLowerCase().trim();
  const cat = (category || '').toLowerCase().trim();

  // 1. Overload / Double Cheese Burger
  if (name.includes('overload') || (name.includes('double') && name.includes('cheese'))) {
    return SVG_BURGER_OVERLOAD;
  }

  // 2. Buy 1 Take 1
  if (name.includes('buy 1 take 1') || name.includes('b1t1') || name.includes('buy1 take1')) {
    if (name.includes('hotdog')) return SVG_HOTDOG;
    return SVG_B1T1_BURGERS;
  }

  // 3. Hotdogs
  if (name.includes('hotdog')) {
    return SVG_HOTDOG;
  }

  // 4. Egg Sandwich
  if (name.includes('egg sandwich') || (name.includes('sandwich') && name.includes('egg'))) {
    return SVG_EGG_SANDWICH;
  }

  // 5. Burger with Drink / Softdrinks
  if (name.includes('softdrink') || name.includes('drink') || name.includes('tea') || name.includes('dew')) {
    if (name.includes('burger') || cat.includes('burger')) return SVG_BURGER_DRINK;
    return SVG_DRINK_BEVERAGE;
  }

  // 6. Cheese Burger & General Burgers
  if (name.includes('cheese burger') || name.includes('cheeseburger')) {
    return SVG_BURGER_CHEESE;
  }
  if (cat.includes('burger') || name.includes('burger')) {
    return SVG_BURGER_CHEESE;
  }

  // 7. Fries
  if (name.includes('fries') || cat.includes('fries') || name.includes('snack')) {
    return SVG_FRIES_CHEESE;
  }

  // 8. Siomai Dimsum
  if (name.includes('siomai') || name.includes('dumpling')) {
    return SVG_SIOMAI_PLATE;
  }

  // 9. Rice Meals / Silog / Classic / Specialties / Favourites
  if (
    cat.includes('meal') ||
    cat.includes('classic') ||
    cat.includes('special') ||
    cat.includes('favourite') ||
    cat.includes('favorite') ||
    name.includes('meal') ||
    name.includes('silog') ||
    name.includes('rice') ||
    name.includes('combo')
  ) {
    return SVG_SILOG_PLATE;
  }

  // 10. Drinks / Beverages
  if (cat.includes('drink') || cat.includes('beverage') || name.includes('juice') || name.includes('water')) {
    return SVG_DRINK_BEVERAGE;
  }

  // Default delicious burger graphic
  return SVG_BURGER_CHEESE;
}

/**
 * Returns either the owner's custom camera/file upload, or gracefully falls back to the inline stylized SVG.
 * Bypasses blocked external unsplash URLs so preview never breaks with "No product image".
 */
export function getProductImageWithFallback(
  currentImage?: string | null,
  productName?: string,
  category?: string
): string {
  // If owner uploaded a custom photo (data URL, base64, or non-unsplash valid image)
  if (currentImage && typeof currentImage === 'string' && currentImage.trim().length > 0) {
    if (!currentImage.includes('unsplash.com')) {
      return currentImage;
    }
  }

  // Gracefully provide the crisp inline SVG food illustration
  return getFoodSvgForProduct(productName, category);
}
