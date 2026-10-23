/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FoodLog, MealCategory } from '../../types';

export function normalizeFitiaMeal(mealRaw: string): MealCategory {
  const m = (mealRaw || '').toLowerCase().trim();
  if (m.includes('desayuno') || m.includes('breakfast')) return 'desayuno';
  if (m.includes('almuerzo') || m.includes('comida') || m.includes('lunch')) return 'almuerzo';
  if (m.includes('merienda') || m.includes('snack') || m.includes('colación') || m.includes('colacion')) return 'merienda';
  if (m.includes('cena') || m.includes('dinner')) return 'cena';
  return 'colacion';
}

function parseFitiaNumber(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/["'\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseFitiaDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (parts[2].length === 4) {
      const year = parts[2];
      const p0 = parseInt(parts[0], 10);
      if (p0 > 12) {
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  return trimmed;
}

/**
 * Parses Fitia CSV or JSON export
 */
export function parseFitiaExport(content: string): FoodLog[] {
  if (!content || typeof content !== 'string') return [];

  // Try parsing JSON first
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      const items = Array.isArray(data) ? data : data.meals || data.foods || data.logs || [];
      return items.map((item: Record<string, unknown>, idx: number) => {
        const rawDate = String(item.date || item.consumed_at || item.fecha || new Date().toISOString().split('T')[0]);
        const date = parseFitiaDate(rawDate);
        const meal = normalizeFitiaMeal(String(item.meal || item.meal_type || item.comida || 'almuerzo'));
        const name = String(item.name || item.food_name || item.alimento || 'Alimento Fitia');
        const cals = Number(item.calories || item.calories_kcal || item.kcal || item.calorias) || 0;
        const prot = Number(item.protein || item.protein_g || item.proteina || 0);
        const carbs = Number(item.carbs || item.carbohydrates_g || item.carbohidratos || 0);
        const fat = Number(item.fat || item.fat_g || item.grasa || 0);
        const fiber = Number(item.fiber || item.fiber_g || item.fibra || 0);

        return {
          id: `fitia_json_${date}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          consumed_at: date,
          meal_type: meal,
          food_name_snapshot: name,
          quantity: Number(item.quantity || item.grams || item.peso || 100),
          unit: String(item.unit || 'g'),
          calories_kcal: Math.round(cals),
          protein_g: Math.round(prot * 10) / 10,
          carbohydrates_g: Math.round(carbs * 10) / 10,
          fat_g: Math.round(fat * 10) / 10,
          fiber_g: fiber > 0 ? Math.round(fiber * 10) / 10 : undefined,
          source: 'fitia' as const,
          external_id: String(item.id || `fitia_${date}_${idx}`),
        };
      });
    } catch {
      // Continue to CSV parser
    }
  }

  // Parse CSV
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  const splitRow = (row: string) => {
    if (delimiter === ',') {
      const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (matches && matches.length > 1) return matches;
    }
    return row.split(delimiter);
  };

  const headers = splitRow(headerLine).map((h) => h.replace(/["']/g, '').trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes('fecha') || h.includes('date'));
  const mealIdx = headers.findIndex((h) => h.includes('comida') || h.includes('tiempo') || h.includes('meal'));
  const foodIdx = headers.findIndex((h) => h.includes('alimento') || h.includes('nombre') || h.includes('food') || h.includes('plato') || h.includes('item'));
  const calsIdx = headers.findIndex((h) => h.includes('calor') || h.includes('kcal') || h.includes('energ'));
  const protIdx = headers.findIndex((h) => h.includes('prot'));
  const carbIdx = headers.findIndex((h) => h.includes('carb'));
  const fatIdx = headers.findIndex((h) => h.includes('gras') || h.includes('lip') || h.includes('fat'));
  const fiberIdx = headers.findIndex((h) => h.includes('fibra') || h.includes('fiber'));
  const gramsIdx = headers.findIndex((h) => h.includes('peso') || h.includes('gram') || h.includes('cant') || h.includes('qty'));

  const logs: FoodLog[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const cells = splitRow(row).map((c) => c.replace(/^"|"$/g, '').trim());

    const dateVal = dateIdx >= 0 ? cells[dateIdx] : new Date().toISOString().split('T')[0];
    if (dateVal.toLowerCase().includes('total') || dateVal.toLowerCase().includes('resumen')) continue;

    const formattedDate = parseFitiaDate(dateVal);
    const mealVal = mealIdx >= 0 ? cells[mealIdx] : 'almuerzo';
    const foodVal = foodIdx >= 0 ? cells[foodIdx] : 'Alimento Fitia';
    const cals = calsIdx >= 0 ? parseFitiaNumber(cells[calsIdx]) : 0;
    const prot = protIdx >= 0 ? parseFitiaNumber(cells[protIdx]) : 0;
    const carb = carbIdx >= 0 ? parseFitiaNumber(cells[carbIdx]) : 0;
    const fat = fatIdx >= 0 ? parseFitiaNumber(cells[fatIdx]) : 0;
    const fiber = fiberIdx >= 0 ? parseFitiaNumber(cells[fiberIdx]) : 0;
    const qty = gramsIdx >= 0 ? parseFitiaNumber(cells[gramsIdx]) || 100 : 100;

    if (cals <= 0 && prot <= 0 && carb <= 0) continue;

    logs.push({
      id: `fitia_csv_${formattedDate}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      consumed_at: formattedDate,
      meal_type: normalizeFitiaMeal(mealVal),
      food_name_snapshot: foodVal,
      quantity: qty,
      unit: 'g',
      calories_kcal: Math.round(cals),
      protein_g: Math.round(prot * 10) / 10,
      carbohydrates_g: Math.round(carb * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      fiber_g: fiber > 0 ? Math.round(fiber * 10) / 10 : undefined,
      source: 'fitia',
      external_id: `fitia_row_${formattedDate}_${mealVal}_${i}`,
    });
  }

  return logs;
}

export const SAMPLE_FITIA_CSV = `Fecha,Comida,Alimento,Calorias,Proteina,Carbohidratos,Grasa,Peso
2026-10-22,Desayuno,"Tortilla de claras con espinacas y pan centeno",320,28.0,24.0,9.0,220
2026-10-22,Almuerzo,"Ternera magra 180g con arroz y verduras salteadas",540,46.0,58.0,12.0,380
2026-10-22,Merienda,"Batido isolado de suero con plátano",260,32.0,27.0,2.0,350
2026-10-22,Cena,"Merluza al horno con patata y espárragos",410,36.0,38.0,8.0,320`;

export const FitiaConnector = {
  getRequirementsAndStatus() {
    return {
      provider: 'fitia',
      status: 'pending_approval' as const,
      statusLabel: 'API pública no disponible (Soporte importación CSV/JSON)',
      details: 'Fitia no dispone actualmente de una API REST abierta para desarrolladores terceros ni portal de autoservicio. Opera principalmente como aplicación móvil. BodyTrack Pro ofrece compatibilidad completa mediante importación de registros exportados de Fitia o carga manual.',
      instructions: [
        '1. Abre la app de Fitia en tu teléfono móvil.',
        '2. Ve a Menú > Exportar historial nutricional (formato CSV o JSON).',
        '3. Comparte o descarga el archivo en tu dispositivo.',
        '4. Carga el archivo aquí para sincronizar tus alimentos consumidos y conteo de macronutrientes.',
      ],
    };
  },

  parseFile(content: string): FoodLog[] {
    return parseFitiaExport(content);
  },
};
