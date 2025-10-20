// PDF Data Interfaces based on schemas.py
export interface SubKeyMoneyAmount {
  amount: string;
  keyword: string;
  name: string;
  ukey: string;
  search_term: string;
  search_range_used: number;
  inline_context: string;
  page: number;
  contact_match_type: string[];
}

export interface MoneyAmount {
  amount: string;
  keyword: string;
  name: string;
  ukey: string;
  search_term: string;
  search_range_used: number;
  inline_context: string;
  page: number;
  contact_match_type: string[];
  sub_keys: SubKeyMoneyAmount[];
}

export interface BillSummaryMoneyAmount {
  sentence: string;
  name: string;
  ukey: string;
  amount: string;
  inline_context: string;
  page: number;
  type: string;
}

export interface LateFee {
  amount: string;
  sentence: string;
  name: string;
  ukey: string;
  inline_context: string;
  page: number;
}

export interface PreviousBalance {
  amount: string;
  date: string;
  sentence: string;
  name: string;
  ukey: string;
  header_type: string;
  inline_context: string;
  page: number;
}

export interface ContactEntry {
  phone: string;
  name: string;
  money_amounts: MoneyAmount[];
}

export interface Summary {
  invoice: string | null;
  account: string | null;
  billing_period: string | null;
  due_date: string | null;
  total_charges: string | null;
  money_amounts: BillSummaryMoneyAmount[];
  late_fees: LateFee[];
  previous_balance: PreviousBalance[];
}

export interface PDFData {
  success: boolean;
  message: string;
  text: string;
  entries: ContactEntry[];
  keywords_used: string[];
  summary: Summary;
}

// Define interfaces for type safety
// Reuse the previously defined MoneyAmount interface above to avoid duplicate declarations and ensure 'sub_keys' modifiers are identical.
// (duplicate interface removed)
export interface Entry {
  name: string;
  phone: string;
  money_amounts: MoneyAmount[];
}

export interface EntryWithDisplayName extends Entry {
  displayName: string;
}

export interface SummaryItem {
  sentence: string;
  amount: string;
  type?: string;
  ukey: string;
}

export interface PartitionDataItem {
  name?: string;
  displayName?: string;
  phone?: string;
  amount: number;
  percentage: string;
  color: string;
}
export interface RomanNumeralEntry {
  name?: string;
  phone?: string;
  amount: number;
  displayName: string;
  money_amounts: MoneyAmount[];
}
export interface IndividualDetailsProps {
  pdfData: PDFData;
  delay?: number;
}
export interface VisualDistributionProps {
  pdfData: PDFData;
  delay?: number;
}

// Define which items belong under Total Adjustments
export const adjustmentChildren = [
  'sales_discretionary_credit',
  'access_adjustments',
  'retail_device_tradein',
  'other_charges',
  'state_tax_adjustment'
];

// Define which items should be children of Total Current Charges Due
export const currentChargesChildren = [
  'monthly_charges',
  'equipment_charges',
  'usage_purchase',
  'surcharges_credits',
  'Taxes_fees'
];

// Define a much brighter and more vibrant color palette - using only hex colors
export const colorPalette = [
  '#0066FF', // Bright Blue
  '#FFCC00', // Bright Yellow       
  '#FF6600', // Bright Orange
  '#9966FF', // Bright Purple
  '#00CCFF', // Bright Cyan
  '#FFDD00', // Bright Gold
  '#FF3366', // Bright Pink/Red
  '#66FF33', // Bright Lime
  '#FF9900', // Bright Amber
  '#6633FF', // Bright Indigo
  '#33FF99', // Bright Mint
  '#FF0099', // Bright Magenta
  '#00FF66', // Bright Green
  '#00FF99', // Bright Turquoise
  '#FF6633', // Bright Coral
  '#3399FF', // Bright Sky Blue
  '#FFFF00', // Bright Pure Yellow
  '#FF0066', // Bright Rose
  '#66FFFF', // Bright Aqua
  '#FF3300', // Bright Red
  '#00FFFF', // Bright Cyan Pure
];