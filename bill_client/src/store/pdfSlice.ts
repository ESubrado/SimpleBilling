import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SubKeyMoneyAmount {
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

interface MoneyAmount {
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

interface BillSummaryMoneyAmount {
  sentence: string;
  name: string;
  ukey: string;
  amount: string;
  inline_context: string;
  page: number;
  type: string;
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
interface LateFee {
  amount: string;
  sentence: string;
  name: string;
  ukey: string;
  inline_context: string;
  page: number;
}
interface ContactEntry {
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

interface PdfData {
  Pages?: any[];
  pageRange?: string;
  totalPages?: number;
  parsedPages?: number; 
  [key: string]: any;
  success: boolean;
  message: string;
  text: string;
  entries: ContactEntry[];
  keywords_used: string[];
  summary: Summary;
}

interface PdfState {
  data: PdfData | null;
  isProcessing: boolean;
  error: string | null;
}

const initialState: PdfState = {
  data: null,
  isProcessing: false,
  error: null,
};

export const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setPdfData: (state, action: PayloadAction<PdfData>) => {
      state.data = action.payload;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.data = null;
    },
    clearPdfData: (state) => {
      state.data = null;
      state.error = null;
      state.isProcessing = false;
    },
  },
});

export const { setProcessing, setPdfData, setError, clearPdfData } = pdfSlice.actions;
export default pdfSlice.reducer;
