/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FoodLog, MealCategory } from '../../types';

export function normalizeMfpMeal(mealRaw: string): MealCategory {
  const m = (mealRaw || '').toLowerCase().trim();
  if (m.includes('break') || m.includes('desayuno')) return 'desayuno';
  if (m.includes('lunch') || m.includes('almuerzo') || m.includes('comida')) return 'almuerzo';
  if (m.includes('snack') || m.includes('merienda') || m.includes('colacion') || m.includes('tarde')) return 'merienda';
  if (m.includes('dinner') || m.includes('cena')) return 'cena';
  return 'colacion';
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  // Replace comma with dot if it looks like a decimal separator e.g. "24,5"
  const cleaned = val.replace(/["'\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Check slashes or dashes
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    // If year is first: YYYY/MM/DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // If year is last: DD/MM/YYYY or MM/DD/YYYY
    if (parts[2].length === 4) {
      const year = parts[2];
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      // If p0 > 12, it must be DD/MM/YYYY
      if (p0 > 12) {
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      // If p1 > 12, it must be MM/DD/YYYY
      if (p1 > 12) {
        return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      // Standard ISO default assuming DD/MM/YYYY for Spanish or MM/DD for MFP standard:
      return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  return trimmed;
}

/**
 * Parses CSV text exported from MyFitnessPal with delimiter auto-detection
 */
export function parseMyFitnessPalCsv(csvText: string): FoodLog[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  // Detect delimiter: semicolon, comma, or tab
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const delimiter = semiCount > commaCount && semiCount > tabCount ? ';' : tabCount > commaCount ? '\t' : ',';

  // Split headers
  const splitRow = (row: string) => {
    if (delimiter === ',') {
      const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (matches && matches.length > 1) return matches;
    }
    return row.split(delimiter);
  };

  const headers = splitRow(headerLine).map((h) => h.replace(/["']/g, '').trim().toLowerCase());

  const dateIdx = headers.findIndex((h) => h === 'date' || h === 'fecha');
  const mealIdx = headers.findIndex((h) => h === 'meal' || h === 'comida' || h.includes('tiempo'));
  const foodIdx = headers.findIndex((h) => h === 'food' || h === 'alimento' || h === 'name' || h === 'item' || h.includes('descrip'));
  const caloriesIdx = headers.findIndex((h) => h.includes('calorie') || h.includes('calorías') || h.includes('caloria') || h.includes('kcal'));
  const proteinIdx = headers.findIndex((h) => h.includes('protein') || h.includes('proteína') || h.includes('proteina'));
  const carbsIdx = headers.findIndex((h) => h.includes('carb') || h.includes('carbohidrato'));
  const fatIdx = headers.findIndex((h) => h === 'fat' || h.includes('grasa') || h.startsWith('fat '));
  const fiberIdx = headers.findIndex((h) => h.includes('fiber') || h.includes('fibra'));

  const logs: FoodLog[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const cleanCells = splitRow(row).map((c) => c.replace(/^"|"$/g, '').trim());

    const dateVal = dateIdx >= 0 ? cleanCells[dateIdx] : '';
    if (!dateVal || dateVal.toLowerCase().includes('total') || dateVal.toLowerCase().includes('goal') || dateVal.toLowerCase().includes('resumen')) {
      continue;
    }

    const formattedDate = parseDate(dateVal);
    const mealVal = mealIdx >= 0 ? cleanCells[mealIdx] : 'almuerzo';
    const foodVal = foodIdx >= 0 ? cleanCells[foodIdx] : 'Registro MFP';
    const cals = caloriesIdx >= 0 ? parseNumber(cleanCells[caloriesIdx]) : 0;
    const prot = proteinIdx >= 0 ? parseNumber(cleanCells[proteinIdx]) : 0;
    const carbs = carbsIdx >= 0 ? parseNumber(cleanCells[carbsIdx]) : 0;
    const fat = fatIdx >= 0 ? parseNumber(cleanCells[fatIdx]) : 0;
    const fiber = fiberIdx >= 0 ? parseNumber(cleanCells[fiberIdx]) : 0;

    // Skip blank or zero calorie summary headers
    if (cals <= 0 && prot <= 0 && carbs <= 0) continue;

    logs.push({
      id: `mfp_${formattedDate}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      consumed_at: formattedDate,
      meal_type: normalizeMfpMeal(mealVal),
      food_name_snapshot: foodVal || 'Alimento MyFitnessPal',
      quantity: 1,
      unit: 'porción',
      calories_kcal: Math.round(cals),
      protein_g: Math.round(prot * 10) / 10,
      carbohydrates_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      fiber_g: fiber > 0 ? Math.round(fiber * 10) / 10 : undefined,
      source: 'myfitnesspal',
      external_id: `mfp_${formattedDate}_${mealVal}_${i}`,
    });
  }

  return logs;
}

export const SAMPLE_MFP_CSV = `Date,Meal,Food,Calories,Protein,Carbohydrates,Fat,Fiber
2026-10-22,Breakfast,"Avena integral con proteína whey y arándanos",420,34.5,52.0,8.0,7.2
2026-10-22,Lunch,"Pechuga de pollo 200g a la plancha con arroz blanco",580,54.0,65.0,7.5,3.0
2026-10-22,Dinner,"Salmón noruego 180g con patata asada y ensalada",510,38.0,42.0,17.5,4.5
2026-10-22,Snacks,"Yogur griego natural 0% con nueces",240,18.0,11.0,14.0,1.5
Total,,,,1750,144.5,170.0,47.0,16.2`;

export const MyFitnessPalConnector = {
  getRequirementsAndStatus() {
    return {
      provider: 'myfitnesspal',
      status: 'pending_approval' as const,
      statusLabel: 'Requiere aprobación de API de socio comercial',
      details: 'MyFitnessPal restringe el acceso a su API directa exclusivamente a empresas certificadas mediante contrato de socio (Under Armour / MyFitnessPal Partner API). Para usuarios individuales, el método oficial autorizado es la exportación de archivo CSV desde Configuración Web de MyFitnessPal.',
      exportInstructions: [
        '1. Inicia sesión en myfitnesspal.com desde un navegador.',
        '2. Ve a Configuración de la Cuenta > Exportar Datos (o "Food and Exercise Diary").',
        '3. Selecciona el rango de fechas deseado y descarga el archivo comprimido (.zip) o el archivo CSV.',
        '4. Arrastra o sube el archivo CSV de nutrición aquí para incorporar automáticamente tus comidas y macronutrientes.',
      ],
    };
  },

  parseFile(fileContent: string): FoodLog[] {
    return parseMyFitnessPalCsv(fileContent);
  },
};
