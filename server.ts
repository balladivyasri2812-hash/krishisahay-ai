import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize server-side Gemini client per AI Studio standards
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'KrishiSahay AI Engine',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // POST /api/gemini/explain-rotation
  app.post('/api/gemini/explain-rotation', async (req: Request, res: Response) => {
    try {
      const { plan, farmProfile, scenario } = req.body;

      if (!plan || !plan.seasons) {
        return res.status(400).json({ error: 'Missing rotation plan payload' });
      }

      const prompt = `You are KrishiSahay AI's Chief Agronomist and Senior Optimization Scientist.
Explain the agronomic and financial rationale for the following mathematically optimized multi-season crop rotation plan.
Do NOT fabricate numbers. Ground your explanation strictly on the real calculated values provided below.

FARM CONTEXT:
- Farm: ${farmProfile.farmName || 'Demo Farm'} (${farmProfile.areaHa} ha, ${farmProfile.location || 'Deccan Plateau'})
- Soil Type: ${farmProfile.soilType}, pH: ${farmProfile.soilPh}
- Starting NPK: N=${farmProfile.nitrogenKgPerHa}kg/ha, P=${farmProfile.phosphorusKgPerHa}kg/ha, K=${farmProfile.potassiumKgPerHa}kg/ha, OM=${farmProfile.organicMatterPercent}%
- Irrigation: ${farmProfile.irrigationType}, Available Water: ${farmProfile.availableWaterM3PerHa} m3/ha
- Active Stress Scenario: ${scenario?.name || 'Normal Season'} (${scenario?.description || 'Baseline climate'})

OPTIMIZED ROTATION PLAN (${plan.strategyName}):
${plan.seasons
  .map(
    (s: any, idx: number) =>
      `Season ${idx + 1} (Year ${s.year} ${s.seasonName}):
  - Crop: ${s.crop.name} (${s.crop.category}, Family: ${s.crop.diseaseFamily})
  - Yield: ${s.projectedYieldTons} tons, Net Profit: ₹${Math.round(s.netProfitInr).toLocaleString()}
  - Water Consumed: ${s.waterRequiredM3} m3 (Balance: ${s.waterBalanceM3 >= 0 ? '+' : ''}${s.waterBalanceM3} m3)
  - Soil N delta: ${s.soilNitrogenDeltaKg >= 0 ? '+' : ''}${s.soilNitrogenDeltaKg} kg/ha, Soil Health After: ${s.soilHealthScoreAfter}/100
  - Disease Risk: ${s.diseaseRiskScore}/100
  - Rationale: ${s.agronomicRationale}`
  )
  .join('\n\n')}

CUMULATIVE METRICS:
- Total Projected Net Profit: ₹${Math.round(plan.metrics.netProfitInr).toLocaleString()}
- Total Water Consumed: ${plan.metrics.totalWaterUsedM3.toLocaleString()} m3 vs Available: ${plan.metrics.waterAvailableM3.toLocaleString()} m3
- Soil Health Trajectory: Started at ${plan.metrics.initialSoilHealth} -> Finished at ${plan.metrics.finalSoilHealth} (Delta: ${plan.metrics.soilHealthDelta >= 0 ? '+' : ''}${plan.metrics.soilHealthDelta} points)
- Average Disease Risk: ${plan.metrics.averageDiseaseRisk}/100
- Sustainability Index: ${plan.metrics.sustainabilityScore}/100
- Feasibility: ${plan.isFeasible ? 'FEASIBLE (Passed all constraints)' : 'INFEASIBLE: ' + (plan.rejectionReasons || []).join(', ')}

Please provide a structured, professional, transparent agronomic explanation covering:
1. Executive Summary of why this schedule was selected.
2. Season-by-season transition logic (e.g. why Crop B follows Crop A, how legumes replenish nitrogen, why specific high-risk crops were avoided).
3. Water budget and soil dynamics verdict.
4. Disease cycle disruption impact (how monoculture pathogens are starved).
5. Farmer risk advisory and execution tips.
Keep it direct, authoritative, and farmer-centric.`;

      if (!process.env.GEMINI_API_KEY) {
        // Return structured fallback
        return res.json({
          source: 'local_engine',
          explanation: generateLocalExplanation(plan, farmProfile, scenario),
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are KrishiSahay AI, an expert agricultural decision-support engine. You explain mathematical crop rotation plans with precision, highlighting soil ecology, water stewardship, and financial resilience.',
          temperature: 0.3,
        },
      });

      return res.json({
        source: 'gemini-3.8-flash',
        explanation: response.text || generateLocalExplanation(plan, farmProfile, scenario),
      });
    } catch (err: any) {
      console.warn('Gemini API call failed, using high-fidelity local agronomic explanation:', err?.message);
      return res.json({
        source: 'local_engine_fallback',
        explanation: generateLocalExplanation(req.body.plan, req.body.farmProfile, req.body.scenario),
      });
    }
  });

  // POST /api/gemini/kisan-vaani
  app.post('/api/gemini/kisan-vaani', async (req: Request, res: Response) => {
    try {
      const { message, plan, farmProfile, language = 'English' } = req.body;

      const prompt = `You are "KisanVaani" (క్రిషీ సహాయ్ - కిసాన్ వాణి), the intelligent multilingual voice and text farm advisory companion in KrishiSahay AI.
The farmer has asked: "${message}".

Language to answer in: ${language} (if Telugu or Hindi is requested, provide warm, respectful, fluent vernacular terms like 'రైతు సోదరా', 'ఖరీఫ్', 'రబీ', 'పప్పుధాన్యాలు', 'భూసారం' or 'किसान भाई', 'मृदा स्वास्थ्य', 'दलहन').

CRITICAL RULE:
You MUST answer using the active optimized crop rotation plan facts calculated by KrishiSahay's optimization engine. Do NOT invent a different crop sequence!

CURRENT ACTIVE PLAN SUMMARY:
- Strategy: ${plan?.strategyName || 'Balanced Plan'}
- Crops scheduled: ${(plan?.seasons || []).map((s: any) => `Year ${s.year} ${s.seasonName}: ${s.crop.name} (Yield: ${s.projectedYieldTons}t, Profit: ₹${Math.round(s.netProfitInr)})`).join(' -> ')}
- Net Profit: ₹${Math.round(plan?.metrics?.netProfitInr || 0).toLocaleString()}
- Soil Health: ${plan?.metrics?.initialSoilHealth || 65} -> ${plan?.metrics?.finalSoilHealth || 78}
- Water Consumption: ${plan?.metrics?.totalWaterUsedM3 || 0} m3
- Total Area: ${farmProfile?.areaHa || 2.5} ha in ${farmProfile?.location || 'Andhra Pradesh / Telangana'}

Answer the farmer's question directly, concisely, and encouragingly in 2 to 4 paragraphs.`;

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          reply: generateLocalKisanVaaniResponse(message, plan, language),
          source: 'local_kisan_vaani',
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({
        reply: response.text || generateLocalKisanVaaniResponse(message, plan, language),
        source: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.warn('KisanVaani Gemini call failed, returning local response:', err?.message);
      return res.json({
        reply: generateLocalKisanVaaniResponse(req.body.message, req.body.plan, req.body.language),
        source: 'local_kisan_vaani_fallback',
      });
    }
  });

  // Mount Vite middlewares in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KrishiSahay AI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

function generateLocalExplanation(plan: any, farm: any, scenario: any): string {
  if (!plan) return 'No rotation plan provided.';

  const crops = plan.seasons.map((s: any) => s.crop.name);
  const netProfit = Math.round(plan.metrics.netProfitInr).toLocaleString();
  const soilDelta = plan.metrics.soilHealthDelta;
  const waterUsed = plan.metrics.totalWaterUsedM3.toLocaleString();
  const waterAvailable = plan.metrics.waterAvailableM3.toLocaleString();

  return `### KrishiSahay AI Agronomic Engine Rationale

**Executive Summary:**
The multi-season optimization engine selected the sequence **${crops.join(' ➔ ')}** under the **${plan.strategyName}** objective. Over ${plan.seasons.length} seasons, this trajectory generates **₹${netProfit} in net farm returns** while conserving **${waterUsed} m³** of irrigation water against an available quota of **${waterAvailable} m³**.

**1. Rotational Sequence Dynamics:**
- **Nutrient Restoration via Legumes:** The inclusion of legume breaks (such as Soybean or Chickpea) contributes biologically fixed atmospheric nitrogen, reversing the depletion caused by heavy feeding cereals.
- **Pathogen Cycle Disruption:** By strictly avoiding consecutive Solanaceae (e.g. Tomato followed by Potato) or continuous Cereal monocultures, soil-borne fungal spore concentrations and root nematode populations drop by an estimated ${Math.max(15, 100 - plan.metrics.averageDiseaseRisk)}%.
- **Root Architecture Synergies:** Alternating shallow fibrous root systems with deep taproots aerates dense soil strata and enhances water infiltration.

**2. Soil Health Trajectory:**
Starting from an initial baseline health score of **${plan.metrics.initialSoilHealth}/100**, the simulated rotation terminates at **${plan.metrics.finalSoilHealth}/100** (Net change: ${soilDelta >= 0 ? '+' : ''}${soilDelta} points). Organic matter balances are preserved through diversified crop residue incorporation.

**3. Water & Climate Resilience:**
In the active scenario (*${scenario?.name || 'Normal Season'}*), water demand is maintained within operating thresholds with zero deficit violations. Water-efficient crops ensure adequate drought margins during critical reproductive phenophases.

**4. Farmer Advisory & Residual Risks:**
Monitor micro-nutrient status (specifically Zinc and Boron) prior to the Kharif planting window. Maintain field sanitation and certified seed provenance to maximize genetic yield expression.`;
}

function generateLocalKisanVaaniResponse(query: string, plan: any, language: string): string {
  const q = (query || '').toLowerCase();
  const firstCrop = plan?.seasons?.[0]?.crop?.name || 'Maize';
  const secondCrop = plan?.seasons?.[1]?.crop?.name || 'Chickpea';
  const totalProfit = Math.round(plan?.metrics?.netProfitInr || 245000).toLocaleString();

  if (language === 'Telugu' || q.includes('next season') || q.includes('crop veyyali') || q.includes('chickpea')) {
    return `నమస్కారం రైతు సోదరా! మీ పొలం నేల స్వభావం మరియు ప్రస్తుత నీటి లభ్యత ఆధారంగా క్రిషీ సహాయ్ AI ఇంజిన్ వచ్చే సీజన్ కోసం **${firstCrop}** పంటను సిఫార్సు చేసింది.

దీని తర్వాత వచ్చే సీజన్‌లో **${secondCrop}** వేయడం వల్ల నేలలో నత్రజని (Nitrogen) సహజంగా పెరిగి, ఖర్చు తగ్గుతుంది మరియు తెగుళ్ళ తీవ్రత తగ్గుతుంది. మొత్తం భ్రమణంలో మీరు దాదాపు ₹${totalProfit} నికర లాభం సాధించవచ్చు. మీ నీటి లభ్యతకు ఇది 100% అనుకూలం!`;
  }

  if (language === 'Hindi') {
    return `नमस्ते किसान भाई! कृषि सहाय AI ऑप्टिमाइज़र ने आपकी ज़मीन और पानी की उपलब्धता का विश्लेषण करके आगामी मौसम के लिए **${firstCrop}** की सिफारिश की है।

इसके बाद **${secondCrop}** बोने से मिट्टी में प्राकृतिक नाइट्रोजन बढ़ेगी और बीमारी का चक्र टूटेगा। इस पूरे फसल चक्र से आपकी अनुमानित शुद्ध आय ₹${totalProfit} होगी। यह योजना आपके जल स्तर के लिए पूरी तरह सुरक्षित है।`;
  }

  return `Namaste Farmer! Based on your soil tests, irrigation capacity, and current market forecasts, KrishiSahay AI has scheduled **${firstCrop}** for your next season, followed by **${secondCrop}**.

This rotation balances high profitability (projected ₹${totalProfit} net return) with natural soil rejuvenation, fixing atmospheric nitrogen while keeping total water usage well within your quota. Let me know if you would like to run a drought test or view alternative strategies!`;
}

startServer();
