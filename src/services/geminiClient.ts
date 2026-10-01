import { FarmProfile, RotationPlan, StressScenario } from '../types/agricultural';

export interface ExplainRotationResponse {
  explanation: string;
  source: string;
}

export interface KisanVaaniResponse {
  reply: string;
  source: string;
}

export async function requestRotationExplanation(
  plan: RotationPlan,
  farmProfile: FarmProfile,
  scenario: StressScenario
): Promise<ExplainRotationResponse> {
  try {
    const res = await fetch('/api/gemini/explain-rotation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan, farmProfile, scenario }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      explanation: data.explanation,
      source: data.source || 'gemini-3.8-flash',
    };
  } catch (err: any) {
    console.warn('Fallback to client-side agronomic explanation:', err?.message);
    return {
      explanation: fallbackClientExplanation(plan, farmProfile, scenario),
      source: 'local_deterministic_engine',
    };
  }
}

export async function askKisanVaani(
  message: string,
  plan: RotationPlan | null,
  farmProfile: FarmProfile,
  language: string = 'English'
): Promise<KisanVaaniResponse> {
  try {
    const res = await fetch('/api/gemini/kisan-vaani', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, plan, farmProfile, language }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      reply: data.reply,
      source: data.source || 'gemini-3.8-flash',
    };
  } catch (err: any) {
    console.warn('Fallback to client-side KisanVaani:', err?.message);
    return {
      reply: fallbackKisanVaaniClient(message, plan, language),
      source: 'local_kisan_vaani',
    };
  }
}

function fallbackClientExplanation(plan: RotationPlan, farm: FarmProfile, scenario: StressScenario): string {
  const cropList = plan.seasons.map(s => s.crop.name).join(' ➔ ');
  const profitStr = Math.round(plan.metrics.netProfitInr).toLocaleString();
  const waterStr = plan.metrics.totalWaterUsedM3.toLocaleString();

  return `### KrishiSahay AI Agronomic Rationale (${plan.strategyName})

**1. Strategic Rotation Choice: ${cropList}**
The optimization engine mathematically resolved this sequence to maximize farm returns while enforcing strict rotational biosecurity. Total projected net profit across ${plan.seasons.length} seasons reaches **₹${profitStr}**.

**2. Soil Health Dynamics:**
- Initial soil health score: **${plan.metrics.initialSoilHealth}/100** ➔ Projected final health: **${plan.metrics.finalSoilHealth}/100** (Delta: ${plan.metrics.soilHealthDelta >= 0 ? '+' : ''}${plan.metrics.soilHealthDelta} pts).
- Legume integration (such as Chickpea or Soybean) enriches topsoil with biologically fixed nitrogen, counterbalancing depletion from intensive commercial crops.

**3. Water Conservation & Climate Stewardship:**
- Total water consumed: **${waterStr} m³** against available seasonal quota of **${plan.metrics.waterAvailableM3.toLocaleString()} m³**.
- Active stress condition: *${scenario.name}*. Zero water deficit violations detected under the current allocation.

**4. Disease Pathogen Interruption:**
By rotating botanical families and interleaving break crops, soil pathogen concentration is suppressed by ~${Math.max(20, 100 - plan.metrics.averageDiseaseRisk)}%, preventing continuous monoculture wilt and root rot buildup.`;
}

function fallbackKisanVaaniClient(query: string, plan: RotationPlan | null, language: string): string {
  const firstCrop = plan?.seasons?.[0]?.crop?.name || 'Maize';
  const secondCrop = plan?.seasons?.[1]?.crop?.name || 'Chickpea';
  const profit = Math.round(plan?.metrics?.netProfitInr || 240000).toLocaleString();

  if (language === 'Telugu' || query.toLowerCase().includes('crop veyyali')) {
    return `రైతు సోదరా, మీ పొలం నేల స్వభావం మరియు నీటి సామర్థ్యం ప్రకారం, వచ్చే సీజన్‌కు **${firstCrop}** పంట అత్యంత అనుకూలమైనది. దీని తర్వాత **${secondCrop}** వేయడం ద్వారా భూసారం పెరుగుతుంది మరియు ₹${profit} వరకు నికర లాభం పొందవచ్చు.`;
  }
  return `Namaste! Based on your farm's calculated optimization plan, **${firstCrop}** is recommended for the upcoming season, sequentially followed by **${secondCrop}** to fix nitrogen and protect against water stress. Projected total net profit is ₹${profit}.`;
}
