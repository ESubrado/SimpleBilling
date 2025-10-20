"use client";
import Navigation from "@/components/navigation";
import AnimatedCard from "@/components/AnimatedCard";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import AnimatedBackground from "@/components/AnimatedBackground";
import VisualDistribution from "./VisualDistribution";
import IndividualDetails from "./IndividualDetails";
import Image from "next/image";
import { Card, CardContent, Divider, Typography, Alert, Box } from "@mui/material";
import { useAppSelector } from "@/hooks/redux";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as React from "react";

// Import interfaces and constants
import {
  SummaryItem, 
  adjustmentChildren,
  currentChargesChildren
} from './interfaces';

export default function Results() {
  const router = useRouter();
  const { data: pdfData, error } = useAppSelector((state) => state.pdf);  
  const [countdown, setCountdown] = useState(7);   

  // Redirect to home if no PDF data is available
  useEffect(() => {
    if (!pdfData && !error) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [pdfData, error, router]);

  // Countdown and redirect on error
  useEffect(() => {
    if (error) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = "/";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [error, router]);

  // Show error if PDF processing failed
  if (error) {
    // Check if it's an invalid document error
    const isInvalidDocument = error.includes("Invalid document") || error.includes("does not contain required Verizon keywords");
    
    return (
      <>
        <Navigation />
        <AnimatedBackground />
        <ScrollToTopButton />
        <div className="font-sans grid items-center justify-items-center min-h-screen px-8 py-0 pb-20 gap-16 w-full bg-black text-white">
          <main className="flex flex-col gap-[24px] row-start-1 items-center w-full max-w-5xl">
            <Alert severity={isInvalidDocument ? "info" : "error"} sx={{ width: '100%', maxWidth: '500px' }}>
              <Typography variant="h6">
                {isInvalidDocument ? "Document Processing Issue" : "PDF Processing Error"}
              </Typography>
              <Typography>{error}</Typography>
              <Typography sx={{ mt: 1, fontSize: '0.875rem', color: isInvalidDocument ? '#ed6c02' : '#d32f2f' }}>
                Redirecting to home page in {countdown} seconds...
              </Typography>
            </Alert>
          </main>
        </div>
      </>
    );
  }

  // Show loading if no data yet
  if (!pdfData) {
    return (
      <>
        <Navigation />
        <AnimatedBackground />
        <ScrollToTopButton />
        <div className="font-sans grid items-center justify-items-center min-h-screen px-8 py-0 pb-20 gap-16 w-full bg-black text-white">
          <main className="flex flex-col gap-[24px] row-start-1 items-center w-full max-w-5xl">
            <Typography variant="h6" sx={{ color: 'white' }}>Loading PDF data...</Typography>
          </main>
        </div>
      </>
    );
  }

  // Debug: Show PDF data structure
  console.log("PDF Data from Redux:", pdfData);  

  return (
    <>
      <Navigation />
      <AnimatedBackground />
      <ScrollToTopButton />
      <div className="font-sans grid items-center justify-items-center min-h-screen px-8 pt-12 pb-20 gap-16 w-full bg-black text-white">
        <main className="flex flex-col gap-[24px] row-start-2 items-center w-full max-w-5xl">
          <Typography variant="h4" component="h1" fontWeight={700} textAlign="center" sx={{ color: 'white' }}>
            Phone Bill Summary and Partitions
          </Typography>                    

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full items-stretch py-3">
            <AnimatedCard delay={0} className="md:col-span-5">
              <Card className="h-full" sx={{ backgroundColor: '#1f2937', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>Account Information</Typography>
                  <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                  
                  {/* Customer Details */}  
                  <div className="mb-4">
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Account Number</Typography>
                    <Typography sx={{ color: 'white' }}>{pdfData.summary.account || 'N/A'}</Typography>
                  </div>
                  
                  <div className="mb-4">
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Invoice Number</Typography>
                    <Typography sx={{ color: 'white' }}>{pdfData.summary.invoice || 'N/A'}</Typography>
                  </div>                                   
                </CardContent>
              </Card>
            </AnimatedCard>
            <AnimatedCard delay={200} className="md:col-span-7">
              <Card className="h-full" sx={{ backgroundColor: '#1f2937', color: 'white' }}>
                <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>Billing Summary</Typography>
                <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 justify-items-start">
                  <div>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>Billing Period</Typography>
                  <Typography sx={{ color: 'white' }}>{pdfData.summary.billing_period || 'N/A'}</Typography>
                  </div>
                  <div>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>Due Date</Typography>
                  <Typography sx={{ color: 'white' }}>{pdfData.summary.due_date || 'N/A'}</Typography>
                  </div>
                  <div className="sm:col-span-2">
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>Total Due</Typography>
                          <Typography variant="h5" fontWeight={700} sx={{ color: 'white' }}>{pdfData.summary.total_charges || 'N/A'}</Typography>
                  </div>
                </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div> 

          {/* Previous Balance Section */}
          <div className="w-full pb-3">
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
              {(() => {
                // Check if adjustments exist in previous_balance data
                const hasAdjustments = pdfData.summary.previous_balance.some((item: SummaryItem) => 
                  adjustmentChildren.includes(item.ukey) || item.ukey === 'total_adjustments'
                );
                
                return hasAdjustments ? "Payments and Adjustments Summary" : "Payments Summary";
              })()}
            </Typography>
            <AnimatedCard delay={200} className="w-full">
              <Card sx={{ backgroundColor: '#1f2937', color: 'white' }}>
                <CardContent>
                  <div className="space-y-2">
                    {/* Display previous balance items if they exist */}
                    {pdfData.summary.previous_balance && pdfData.summary.previous_balance.length > 0 ? (
                      (() => {
                        const items = pdfData.summary.previous_balance;
                        const renderedItems: React.JSX.Element[] = [];
                        
                        // Separate parents and group children
                        const parents: any[] = [];
                        const orphanedChildren: any[] = [];

                        items.forEach((item: SummaryItem) => {
                          if (item.ukey === 'previous_balance') {
                            parents.push({ ...item, children: [] });
                          } else if (item.ukey === 'total_payments') {
                            parents.push({ ...item, children: [] });
                          } else if (item.ukey === 'total_adjustments') {
                            // Find all adjustment children that appear in the items
                            const children = items.filter((child: SummaryItem) => adjustmentChildren.includes(child.ukey));
                            parents.push({ ...item, children });
                          } else if (item.ukey === 'credit_balance') {
                            parents.push({ ...item, children: [] });
                          } else if (item.ukey === 'payment_received') {
                            // This should be under Total Payments - we'll handle this after finding the parent
                            const paymentsParent = parents.find(p => p.ukey === 'total_payments');
                            if (paymentsParent) {
                              paymentsParent.children.push(item);
                            }
                            // Don't add to orphaned children - just skip it
                          } else if (!adjustmentChildren.includes(item.ukey)) {
                            // Items that don't belong to any specific parent
                            // Skip payment_received to prevent it from appearing as orphaned
                            if (item.ukey !== 'payment_received') {
                              orphanedChildren.push(item);
                            }
                          }
                        });

                        // Now handle Payment Received for Total Payments
                        items.forEach((item: SummaryItem) => {
                          if (item.ukey === 'payment_received') {
                            const paymentsParent = parents.find(p => p.ukey === 'total_payments');
                            if (paymentsParent && !paymentsParent.children.some((c: any) => c.ukey === item.ukey)) {
                              paymentsParent.children.push(item);
                            }
                            // Don't add to orphaned children if no parent found
                          }
                        });

                        const renderParentWithChildren = (parent: any, index: number) => {
                          return (
                            <div key={`parent-group-${index}`} className="space-y-1">
                              {/* Parent item */}
                              <div className="flex justify-between items-center">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    flex: 1,
                                    fontWeight: 600,
                                    color: 'white'
                                  }}
                                >
                                  {parent.sentence}
                                  {/* Add contact number if includeContact is true and contact exists */}
                                  {parent.includeContact && parent.contact && (
                                    <span style={{ color: '#9ca3af', marginLeft: '8px', fontWeight: 'normal' }}>
                                      (Contact: {parent.contact})
                                    </span>
                                  )}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600}
                                  sx={{ color: 'white' }}
                                >
                                  {parent.amount}
                                </Typography>
                              </div>
                              
                              {/* Child items if any */}
                              {parent.children && parent.children.length > 0 && (
                                <div className="ml-4 space-y-1 border-l-2 border-gray-600 pl-3">
                                  {parent.children.map((child: any, childIndex: number) => (
                                    <div key={`child-${index}-${childIndex}`} className="flex justify-between items-center">
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          flex: 1,
                                          color: '#d1d5db',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        {child.sentence}{child.includeContact && child.contact ? ' for ' + child.contact : ''}
                                        {/* Add date in parenthesis for Total Adjustments children */}
                                        {parent.ukey === 'total_adjustments' && child.date && (
                                          <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
                                            ({child.date})
                                          </span>
                                        )}                                        
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: '#d1d5db',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        {child.amount}
                                      </Typography>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add divider after parent groups except the last one */}
                              {index < parents.length + orphanedChildren.length - 1 && (
                                <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                              )}
                            </div>
                          );
                        };

                        // Render all parent groups
                        parents.forEach((parent, index) => {
                          renderedItems.push(renderParentWithChildren(parent, index));
                        });

                        // Render orphaned children as standalone items
                        orphanedChildren.forEach((item, index) => {
                          renderedItems.push(
                            <div key={`orphan-${index}`} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    flex: 1,
                                    color: 'white'
                                  }}
                                >
                                  {item.sentence}
                                  {/* Add contact number for orphaned items if includeContact is true */}
                                  {item.includeContact && item.contact && (
                                    <span style={{ color: '#9ca3af', marginLeft: '8px', fontWeight: 'normal' }}>
                                      (Contact: {item.contact})
                                    </span>
                                  )}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ color: 'white' }}
                                >
                                  {item.amount}
                                </Typography>
                              </div>
                              {index < orphanedChildren.length - 1 && (
                                <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                              )}
                            </div>
                          );
                        });

                        return renderedItems;
                      })()
                    ) : (
                      <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                        No previous balance information available
                      </Typography>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>

          {/* All Charges Summary Section */}
          <div className="w-full pb-3">
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
              All Charges Summary
            </Typography>
            <AnimatedCard delay={400} className="w-full">
              <Card sx={{ backgroundColor: '#1f2937', color: 'white' }}>
                <CardContent>
                  <div className="space-y-2">
                    {/* Display API returned money amounts with parent-child structure */}
                    {pdfData.summary.money_amounts && pdfData.summary.money_amounts.length > 0 ? (
                      (() => {
                        const items = pdfData.summary.money_amounts;
                        const renderedItems: React.JSX.Element[] = [];

                        // Separate parents and group children
                        const parents: any[] = [];
                        const orphanedChildren: any[] = [];

                        items.forEach((item: { sentence: string; amount: string; type: string; ukey: string }) => {
                          if (item.ukey === 'balance_forward') {
                            parents.push({ ...item, children: [] });
                          } else if (item.ukey === 'total_charges_due') {
                            // Find all current charges children that appear in the items
                            const children = items.filter((child: { ukey: string }) => 
                              currentChargesChildren.includes(child.ukey)
                            );
                            
                            // Handle late fees for surcharges_credits child
                            const updatedChildren = children.map((child: any) => {
                              if (child.ukey === 'surcharges_credits') {
                                const lateFees = pdfData.summary.late_fees || [];
                                const totalLateFees = lateFees.reduce((sum: number, fee: { amount: string }) => {
                                  const amount = parseFloat(fee.amount.replace(/[\$,]/g, '')) || 0;
                                  return sum + amount;
                                }, 0);
                                
                                return {
                                  ...child,
                                  hasLateFees: lateFees.length > 0,
                                  totalLateFees: totalLateFees,
                                  lateFeeCount: lateFees.length
                                };
                              }
                              return child;
                            });
                            
                            parents.push({ ...item, children: updatedChildren });
                          } else if (item.ukey === 'total_charges') {
                            parents.push({ ...item, children: [] });
                          } else if (!currentChargesChildren.includes(item.ukey || '')) {
                            // Items that don't belong to any specific parent
                            orphanedChildren.push(item);
                          }
                        });

                        const renderParentWithChildren = (parent: any, index: number) => {
                          return (
                            <div key={`parent-group-${index}`} className="space-y-1">
                              {/* Parent item */}
                              <div className="flex justify-between items-center">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    flex: 1,
                                    fontWeight: 600,
                                    color: 'white'
                                  }}
                                >
                                  {parent.sentence}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600}
                                  sx={{ color: 'white' }}
                                >
                                  {parent.amount}
                                </Typography>
                              </div>
                              
                              {/* Child items if any */}
                              {parent.children && parent.children.length > 0 && (
                                <div className="ml-4 space-y-1 border-l-2 border-gray-600 pl-3">
                                  {parent.children.map((child: any, childIndex: number) => (
                                    <div key={`child-${index}-${childIndex}`} className="space-y-1">
                                      <div className="flex justify-between items-center">
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            flex: 1,
                                            color: '#d1d5db',
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          {child.sentence}
                                        </Typography>
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: '#d1d5db',
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          {child.amount}
                                        </Typography>
                                      </div>
                                      
                                      {/* Show late fees info for surcharges_credits */}
                                      {child.hasLateFees && (
                                        <div className="ml-2">
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              fontSize: '0.65rem', 
                                              fontStyle: 'italic', 
                                              color: '#9ca3af',
                                              display: 'block'
                                            }}
                                          >
                                            (includes Late Fee{child.lateFeeCount > 1 ? 's' : ''} of ${child.totalLateFees.toFixed(2)})
                                          </Typography>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add divider after parent groups except the last one */}
                              {index < parents.length + orphanedChildren.length - 1 && (
                                <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                              )}
                            </div>
                          );
                        };

                        // Render all parent groups
                        parents.forEach((parent, index) => {
                          renderedItems.push(renderParentWithChildren(parent, index));
                        });

                        // Render orphaned children as standalone items
                        orphanedChildren.forEach((item, index) => {
                          renderedItems.push(
                            <div key={`orphan-${index}`} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    flex: 1,
                                    fontWeight: (item.ukey === 'balance_forward' || item.ukey === 'total_charges_due') ? 600 : 'normal',
                                    color: 'white'
                                  }}
                                >
                                  {item.sentence}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: (item.ukey === 'balance_forward' || item.ukey === 'total_charges_due') ? 600 : 'normal',
                                    color: 'white' 
                                  }}
                                >
                                  {item.amount}
                                </Typography>
                              </div>
                              {index < orphanedChildren.length - 1 && (
                                <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                              )}
                            </div>
                          );
                        });

                        // Add the grand total calculation
                        renderedItems.push(
                          <div key="grand-total" className="space-y-1">
                            <Divider sx={{ my: 1.5, borderColor: '#374151' }} />
                            <div className="flex justify-between items-center">
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  flex: 1,
                                  fontWeight: 600,
                                  color: 'white'
                                }}
                              >
                                Charges Grand Total (Balance Forward + Current Charges Due)
                              </Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight={600}
                                sx={{ color: 'white' }}
                              >
                                {(() => {
                                  const baseTotal = items
                                    .filter((item: { ukey: string }) => 
                                      item.ukey === 'balance_forward' || item.ukey === 'total_charges_due'
                                    )
                                    .reduce((sum: number, item: { amount: string }) => {
                                      const amount = parseFloat(item.amount.replace(/[\$,]/g, '')) || 0;
                                      return sum + amount;
                                    }, 0);
                                  
                                  // Add late fees to grand total
                                  const lateFees = pdfData.summary.late_fees || [];
                                  const totalLateFees = lateFees.reduce((sum: number, fee: { amount: string }) => {
                                    const amount = parseFloat(fee.amount.replace(/[\$,]/g, '')) || 0;
                                    return sum + amount;
                                  }, 0);
                                  
                                  const grandTotal = baseTotal + totalLateFees;
                                  
                                  // Format with proper negative sign placement
                                  if (grandTotal < 0) {
                                    return `-$${Math.abs(grandTotal).toFixed(2)}`;
                                  } else {
                                    return `$${grandTotal.toFixed(2)}`;
                                  }
                                })()}
                              </Typography>
                            </div>
                          </div>
                        );

                        return renderedItems;
                      })()
                    ) : (
                      <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                        No charges information available
                      </Typography>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>   

          {/* Charge Distribution Visualization */}
          <VisualDistribution pdfData={pdfData} delay={600} />

          {/* Individual Line Details */}
          <IndividualDetails pdfData={pdfData} delay={1000} />

          {/* PDF Processing Information Section */}
          <div className="w-full pb-3">
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
              PDF Processing Information
            </Typography>
            <AnimatedCard delay={800} className="w-full">
              <Card sx={{ width: '100%', backgroundColor: '#1f2937', color: 'white' }}>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>Filename</Typography>
                      <Typography sx={{ color: 'white' }}>
                        {(() => {
                          // Try different possible filename properties
                          const filename = pdfData.pdf_filename || pdfData.filename || pdfData.file_name || pdfData.name;
                          return filename || 'N/A';
                        })()}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>Total Pages</Typography>
                      <Typography sx={{ color: 'white' }}>
                        {pdfData.total_pages || 'N/A'}
                      </Typography>
                    </div>
                  </div>

                  {/* Extracted Text Section */}
                  <div>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>Extracted JSON Text</Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: '#111827',
                        color: '#e5e7eb',
                        padding: 2,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid #374151'
                      }}
                    >
                      {pdfData.text || 'No text extracted'}
                    </Box>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </main>

        {/* Footer */}
        <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
            <a
            className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-white hover:text-gray-300"
            href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
            >
            <Image
                aria-hidden
                src="/file.svg"
                alt="File icon"
                width={16}
                height={16}
                style={{ filter: 'invert(1)' }}
            />
            Learn
            </a>
            <a
            className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-white hover:text-gray-300"
            href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
            >

            <Image
                aria-hidden
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
                style={{ filter: 'invert(1)' }}
            />
            Go to nextjs.org →
            </a>
        </footer>
      </div>
    </>
  );
}
