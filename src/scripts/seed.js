import bcrypt from 'bcrypt';
import { pathToFileURL } from 'node:url';
import { AppConfig, ExpenseCategory, IncomeCategory, CropCatalog, Admin } from '../models/index.js';

const EXPENSE_CATEGORIES = [
  { name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Manure', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Pesticides & insecticides', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Irrigation / water', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Hired labour', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Hired machinery / fuel', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Owned machinery fuel', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Bullock labour (hired)', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Land rent (leased-in)', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Interest on loan', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Transport', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Land revenue / taxes', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Miscellaneous', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Family labour', cacpTag: 'FL', isPaidOut: false, isImputed: true },
  { name: 'Own-land rental value', cacpTag: 'C2', isPaidOut: false, isImputed: true },
  { name: 'Owned machinery depreciation', cacpTag: 'C2', isPaidOut: false, isImputed: true },
];

const INCOME_CATEGORIES = [
  { name: 'Crop sale', type: 'main_produce' },
  { name: 'By-product sale', type: 'by_product' },
  { name: 'Government subsidy / MSP', type: 'subsidy' },
  { name: 'Crop insurance payout', type: 'insurance' },
  { name: 'Custom hire income', type: 'custom_hire' },
  { name: 'Other income', type: 'other' },
];

const CROPS = [
  { name: 'Wheat', defaultSeason: 'rabi' },
  { name: 'Paddy', defaultSeason: 'kharif' },
  { name: 'Cotton', defaultSeason: 'kharif' },
  { name: 'Soybean', defaultSeason: 'kharif' },
  { name: 'Sugarcane', defaultSeason: 'perennial' },
  { name: 'Gram (chana)', defaultSeason: 'rabi' },
];

export const LAND_UNIT_CONVERSIONS = {
  acre: { default: 43560 },
  hectare: { default: 107639 },
  guntha: { default: 1089 },
  cent: { default: 435.6 },
  bigha: {
    'West Bengal': 14400,
    'Uttar Pradesh': 27000,
    Punjab: 9070,
    Haryana: 9070,
    Rajasthan: 27225,
    default: 27000,
  },
};

export async function runSeed({ adminEmail, adminPassword } = {}) {
  if (!(await AppConfig.countDocuments())) {
    await AppConfig.create({ landUnitConversions: LAND_UNIT_CONVERSIONS });
  }
  if (!(await ExpenseCategory.countDocuments())) await ExpenseCategory.insertMany(EXPENSE_CATEGORIES);
  if (!(await IncomeCategory.countDocuments())) await IncomeCategory.insertMany(INCOME_CATEGORIES);
  if (!(await CropCatalog.countDocuments())) await CropCatalog.insertMany(CROPS);
  if (adminEmail && adminPassword && !(await Admin.countDocuments())) {
    await Admin.create({
      name: 'Owner',
      email: adminEmail,
      role: 'superadmin',
      passwordHash: await bcrypt.hash(adminPassword, 10),
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const env = (await import('../config/env.js')).default;
    const { connectDb, disconnectDb } = await import('../config/db.js');
    if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required to seed');
    await connectDb(env.MONGODB_URI);
    await runSeed({ adminEmail: process.env.SEED_ADMIN_EMAIL, adminPassword: process.env.SEED_ADMIN_PASSWORD });
    await disconnectDb();
    console.log('seed complete');
  })();
}
