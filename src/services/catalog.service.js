import { CropCatalog, ExpenseCategory, IncomeCategory } from '../models/index.js';
import { conversionTable } from '../lib/conversions.js';

export const crops = () => CropCatalog.find({ isActive: true }).sort({ name: 1 });
export const expenseCategories = () => ExpenseCategory.find({ isActive: true }).sort({ name: 1 });
export const incomeCategories = () => IncomeCategory.find({ isActive: true }).sort({ name: 1 });

export async function landUnits() {
  const table = await conversionTable();
  return Object.keys(table).map((unit) => ({ unit }));
}
