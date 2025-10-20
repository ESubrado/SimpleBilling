"use client";
import React, { useMemo } from "react";
import { Card, CardContent, Divider, Typography } from "@mui/material";
import AnimatedCard from "../../components/AnimatedCard";
import ExportToPDF from "../../components/PDFExport";
import { 
  MoneyAmount, 
  Entry, 
  LateFee,
  RomanNumeralEntry, 
  IndividualDetailsProps 
} from "@/app/results/interfaces";


const IndividualDetails: React.FC<IndividualDetailsProps> = ({ 
  pdfData, 
  delay = 1000 
}) => {
  // Helper function to add Roman numerals to duplicate names
  const addRomanNumeralsToNames = <T extends { name: string; phone: string; amount: number }>(entries: T[]): (T & { displayName: string; phone: string; amount: number })[] => {
    const nameCount: { [key: string]: number } = {};
    const nameIndexes: { [key: string]: number } = {};
    
    // First pass: count occurrences of each name
    entries.forEach(entry => {
      const name = entry.name || 'Unknown';
      nameCount[name] = (nameCount[name] || 0) + 1;
    });
    
    // Helper function to convert number to Roman numeral
    const toRomanNumeral = (num: number): string => {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      return romanNumerals[num - 1] || num.toString();
    };
    
    // Second pass: add Roman numerals for duplicates
    return entries.map(entry => {
      const name = entry.name || 'Unknown';
      if (nameCount[name] > 1) {
        nameIndexes[name] = (nameIndexes[name] || 0) + 1;
        return {
          ...entry,
          displayName: `${name} ${toRomanNumeral(nameIndexes[name])}`
        };
      }
      return {
        ...entry,
        displayName: name
      };
    });
  };

  // Calculate entries with Roman numerals for individual line details
  const entriesWithRomanNumerals = useMemo(() => {
    if (!pdfData?.entries || pdfData.entries.length === 0) {
      return [];
    }
    // Add Roman numerals to duplicate names, preserving money_amounts
    const entriesWithAmount = pdfData.entries.map((entry: Entry) => {
      const totalItem = entry.money_amounts?.find(money => money.ukey === 'total');
      const total = totalItem ? parseFloat(totalItem.amount.replace(/[\$,]/g, '')) || 0 : 0;
      return {
        ...entry,
        amount: total,
      };
    });
    
    // Sort by amount in descending order (largest to smallest) BEFORE adding Roman numerals
    const sortedEntries = entriesWithAmount.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);
    
    return addRomanNumeralsToNames(sortedEntries).map((entryWithDisplayName) => {
      // Find the original entry to get money_amounts
      const original = pdfData.entries.find((e: Entry) =>
        e.name === entryWithDisplayName.name && e.phone === entryWithDisplayName.phone
      );
      return {
        ...entryWithDisplayName,
        money_amounts: original?.money_amounts || [],
      };
    });
  }, [pdfData]);

  if (!entriesWithRomanNumerals || entriesWithRomanNumerals.length === 0) {
    return null;
  }

  return (
    <div className="w-full pb-3">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
        Individual Line Details {pdfData.summary?.late_fees && pdfData.summary.late_fees.length > 0 ? '(with Late Fees)' : ''}
      </Typography>
      <div className="flex flex-col gap-4 w-full">
        {entriesWithRomanNumerals.map((entry: RomanNumeralEntry, index: number) => (
          <AnimatedCard key={`entry-${index}`} delay={delay + (index * 100)}>
            <Card 
              id={`line-detail-card-${index}`}
              sx={{ width: '100%', backgroundColor: '#1f2937', color: 'white' }}
            >
              <CardContent>
                {/* Header with name, phone, and export button */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: 'white' }}>
                      {entry.displayName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      {entry.phone}
                    </Typography>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <ExportToPDF
                      elementId={`line-detail-card-${index}`}
                      filename={`${entry.displayName.replace(/[^a-zA-Z0-9]/g, '_')}_Line_Details`}
                      buttonText="Export PDF"
                      variant="outlined"
                      size="small"
                    />
                  </div>
                </div>
                
                <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                
                {/* Money amounts */}
                {entry.money_amounts && entry.money_amounts.length > 0 ? (
                  <div className="space-y-2">                   
                    {entry.money_amounts.map((money: MoneyAmount, moneyIndex: number) => (
                      <div key={`money-${index}-${moneyIndex}`} className="space-y-1">
                        {/* Add divider before total ukey */}
                        {money.ukey === 'total' && (
                          <Divider sx={{ my: 1, borderColor: '#6b7280' }} />
                        )}
                        
                        {/* Parent charge - only show if no sub_keys */}
                        {(!money.sub_keys || money.sub_keys.length === 0) && (
                          <div className="flex justify-between items-center">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                flex: 1,
                                fontWeight: 600,
                                color: 'white'                                
                              }}
                            >
                              {money.name || money.keyword || 'Charge'}                               
                              {money.ukey === 'total' && entry.phone ? " for " + entry.phone : ''}                              
                            </Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight={600}
                              sx={{ color: 'white' }}
                            >
                              {money.amount}
                            </Typography>
                          </div>
                        )}
                        
                        {/* If sub_keys exist, show parent keyword as section header with amount */}
                        {money.sub_keys && money.sub_keys.length > 0 && (
                          <>
                            {/* Parent keyword with amount on the same line */}
                            <div className="flex justify-between items-center mb-2">
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: 'white',
                                  flex: 1
                                }}
                              >
                                {money.name || money.keyword || 'Charge Details'}: {money.ukey === 'total' && entry.phone ? " for " + entry.phone : ''}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight={600}
                                sx={{ color: 'white' }}
                              >
                                {money.amount}
                              </Typography>
                            </div>
                            
                            <div className="ml-4 space-y-1 border-l-2 border-gray-600 pl-3">
                              {/* Sub keys */}
                              {(() => {
                                // Group sub keys by category
                                const categorizedSubKeys = money.sub_keys.reduce((acc: any, subKey: any) => {
                                  const category = subKey.category && subKey.category.trim() !== '' ? subKey.category : 'uncategorized';
                                  if (!acc[category]) {
                                    acc[category] = [];
                                  }
                                  acc[category].push(subKey);
                                  return acc;
                                }, {});

                                // Check if we have any actual categories (not just uncategorized)
                                const hasCategories = Object.keys(categorizedSubKeys).some(key => key !== 'uncategorized');

                                if (!hasCategories && categorizedSubKeys.uncategorized) {
                                  // No categories - display normally
                                  return categorizedSubKeys.uncategorized.map((subKey: any, subIndex: number) => (
                                    <div key={`subkey-${index}-${moneyIndex}-${subIndex}`} className="space-y-1">
                                      {/* Sub key charge in three columns with custom widths */}
                                      <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 items-center">
                                        {/* Column 1: Keyword with installment and expiration (wider) */}
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: '#d1d5db',
                                            fontSize: '0.75rem',
                                            textAlign: 'left'
                                          }}
                                        >
                                          {subKey.name || subKey.keyword || 'Sub Item'}                                     
                                          {subKey.installment && subKey.installment.trim() !== '' ? ` (${subKey.installment})` : ""}
                                          {subKey.expiration && subKey.expiration.trim() !== '' ? ` (${subKey.expiration})` : ""}
                                        </Typography>
                                        
                                        {/* Column 2: Date Range (narrower) */}
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: '#9ca3af',
                                            fontSize: '0.75rem',
                                            textAlign: 'center',
                                            fontStyle: 'italic'
                                          }}
                                        >
                                          {subKey.date_range && subKey.date_range.trim() !== '' ? subKey.date_range : " "}
                                        </Typography>
                                        
                                        {/* Column 3: Amount (narrower) */}
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: '#d1d5db',
                                            fontSize: '0.75rem',
                                            textAlign: 'right'
                                          }}
                                        >
                                          {subKey.amount || 'N/A'}
                                        </Typography>
                                      </div>                                 
                                    </div>
                                  ));
                                } else {
                                  // Has categories - display with category divisions
                                  return Object.entries(categorizedSubKeys).map(([category, subKeys]: [string, any], categoryIndex: number) => (
                                    <div key={`category-${category}-${index}-${moneyIndex}`} className="space-y-2" style={{ 
                                      marginBottom: '6px',
                                      paddingBottom: '6px'
                                    }}>
                                      {/* Category header (only if not uncategorized) */}
                                      {category !== 'uncategorized' && (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: '#fbbf24',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            textTransform: 'capitalize',
                                            display: 'block',
                                            borderBottom: '1px solid #374151',
                                            paddingBottom: '4px',
                                            marginBottom: '12px'
                                          }}
                                        >
                                          {category}
                                        </Typography>
                                      )}
                                      
                                      {/* Sub keys for this category */}
                                      <div style={{ paddingBottom: '6px' }}>
                                        {subKeys.map((subKey: any, subIndex: number) => (
                                          <div key={`subkey-${category}-${index}-${moneyIndex}-${subIndex}`} className="space-y-1" style={{ 
                                            marginBottom: subIndex < subKeys.length - 1 ? '6px' : '0',
                                            paddingBottom: subIndex === subKeys.length - 1 ? '8px' : '0'
                                          }}>
                                            {/* Sub key charge in three columns with custom widths */}
                                            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 items-center">
                                              {/* Column 1: Keyword with installment and expiration (wider) */}
                                              <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                  color: '#d1d5db',
                                                  fontSize: '0.75rem',
                                                  textAlign: 'left'
                                                }}
                                              >
                                                {subKey.name || subKey.keyword || 'Sub Item'}                                     
                                                {subKey.installment && subKey.installment.trim() !== '' ? ` (${subKey.installment})` : ""}
                                                {subKey.expiration && subKey.expiration.trim() !== '' ? ` (${subKey.expiration})` : ""}
                                              </Typography>
                                              
                                              {/* Column 2: Date Range (narrower) */}
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: '#9ca3af',
                                                  fontSize: '0.75rem',
                                                  textAlign: 'center',
                                                  fontStyle: 'italic'
                                                }}
                                              >
                                                {subKey.date_range && subKey.date_range.trim() !== '' ? subKey.date_range : " "}
                                              </Typography>
                                              
                                              {/* Column 3: Amount (narrower) */}
                                              <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                  color: '#d1d5db',
                                                  fontSize: '0.75rem',
                                                  textAlign: 'right'
                                                }}
                                              >
                                                {subKey.amount || 'N/A'}
                                              </Typography>
                                            </div>                                 
                                          </div>
                                        ))}
                                      </div> 
                                    </div>
                                  ));
                                }
                              })()}
                            </div>
                          </>
                        )} 
                        
                      </div>
                    ))}
                  </div>
                ) : (
                  <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                    No charges found
                  </Typography>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}

        {/* Account Level Charges Card */}
        {pdfData.summary && pdfData.summary.late_fees && pdfData.summary.late_fees.length > 0 && (
          <AnimatedCard delay={delay + (entriesWithRomanNumerals.length * 100)}>
            <Card 
              id="account-level-charges-card"
              sx={{ 
                width: '100%',
                backgroundColor: '#4c1d1d',
                border: '1px solid #7f1d1d',
                '& .MuiCardContent-root': {
                  backgroundColor: '#4c1d1d'
                }
              }}
            >
              <CardContent>
                {/* Header without export button */}
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                  Account Level Charges
                </Typography>
                
                <Divider sx={{ my: 1.5, borderColor: '#7f1d1d' }} />
                
                {/* Sub header */}
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#9ca3af' }}>
                  Other Charges and Credits:
                </Typography>
                
                {/* Late fees */}
                <div className="space-y-2">
                  {pdfData.summary.late_fees.map((lateFee: LateFee, lateFeeIndex: number) => (
                    <div key={`late-fee-${lateFeeIndex}`} className="flex justify-between items-center">
                      <Typography variant="body2" sx={{ flex: 1, color: 'white' }} fontWeight={600}>
                        {lateFee.sentence}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'white' }}>
                        {lateFee.amount}
                      </Typography>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        )}
      </div>
    </div>
  );
};

export default IndividualDetails;