"use client";
import React, { useLayoutEffect, useRef, useMemo } from "react";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AnimatedCard from "../../components/AnimatedCard";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { PartitionDataItem, Entry, LateFee, colorPalette, VisualDistributionProps } from "@/app/results/interfaces";


const VisualDistribution: React.FC<VisualDistributionProps> = ({ 
  pdfData, 
  delay = 600 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

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

  // Calculate partition data for pie chart
  const partitionData = useMemo(() => {
    if (!pdfData?.entries || pdfData.entries.length === 0) {
      return [];
    }

    // Calculate total for each entry using only "total" ukey
    const entryTotals = pdfData.entries.map((entry: Entry) => {
      // Find the "total" ukey amount for this entry
      const totalItem = entry.money_amounts.find(money => money.ukey === 'total');
      const total = totalItem ? parseFloat(totalItem.amount.replace(/[\$,]/g, '')) || 0 : 0;

      return {
        name: entry.name || 'Unknown',
        phone: entry.phone || '',
        amount: total,
      };
    });

    // Add Roman numerals to duplicate names
    const entriesWithRomanNumerals = addRomanNumeralsToNames(entryTotals);

    // Add late fees as a separate entry if they exist
    const lateFees = pdfData.summary.late_fees || [];
    const totalLateFees = lateFees.reduce((sum: number, fee: LateFee) => {
      const amount = parseFloat(fee.amount.replace(/[\$,]/g, '')) || 0;
      return sum + amount;
    }, 0);

    if (totalLateFees > 0) {
      entriesWithRomanNumerals.push({
        name: 'Late Fees & Account Charges',
        displayName: 'Late Fees & Account Charges',
        phone: 'Account Level',
        amount: totalLateFees,
      });
    }

    // Filter out entries with zero amounts
    const validEntries = (entriesWithRomanNumerals as Array<{ amount: number; displayName: string; name: string; phone: string }>).filter((entry) => entry.amount > 0);

    if (validEntries.length === 0) {
      return [];
    }

    // Calculate grand total from valid entries only
    const grandTotal = validEntries.reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0);

    // Calculate percentages and prepare data for chart
    const chartData = validEntries.map((entry: { amount: number; displayName: string; name: string; phone: string }, index: number) => ({
      ...entry,
      percentage: grandTotal > 0 ? ((entry.amount / grandTotal) * 100).toFixed(1) : '0.0',
      color: entry.displayName === 'Late Fees & Account Charges' 
        ? '#FF0033' // Bright Red for late fees (keep distinctive)
        : colorPalette[index % colorPalette.length], // Cycle through bright colors
    }));

    // Sort by amount in descending order (largest to smallest)
    return chartData.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);
  }, [pdfData]);

  // Create amCharts 3D Pie Chart
  useLayoutEffect(() => {
    if (!chartRef.current || partitionData.length === 0) return;

    // Create root element
    const root = am5.Root.new(chartRef.current);

    // Set themes
    root.setThemes([
      am5themes_Animated.new(root)
    ]);

    // Create chart
    const chart = root.container.children.push(am5percent.PieChart.new(root, {
      layout: root.verticalLayout
      // Removed innerRadius to make it a full pie chart instead of donut
    }));

    // Create series
    const series = chart.series.push(am5percent.PieSeries.new(root, {
      valueField: "amount",
      categoryField: "name",
      alignLabels: false // Disable label alignment
    }));

    // Configure slices
    series.slices.template.setAll({
      strokeOpacity: 0,
      strokeWidth: 2,
      cornerRadius: 2
    });

    // Hide all labels completely
    series.labels.template.set("visible", false);

    // Hide ticks (arrows/lines connecting labels to slices)
    series.ticks.template.set("visible", false);

    // Set data
    const chartDataFormatted = partitionData.map((item: PartitionDataItem) => ({
      name: item.name,
      amount: item.amount
    }));

    series.data.setAll(chartDataFormatted);

    // Set colors after series is ready - ensure hex colors only
    setTimeout(() => {
      series.dataItems.forEach((dataItem, index) => {
        if (partitionData[index]) {
          const slice = dataItem.get("slice");
          if (slice) {
            // Ensure the color is a valid hex color
            let color = partitionData[index].color;
            if (!color.startsWith('#')) {
              color = '#0066FF'; // fallback to blue if not hex
            }
            slice.set("fill", am5.color(color));
          }
        }
      });
    }, 100);

    // Play initial series animation
    series.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [partitionData]);

  if (partitionData.length === 0) {
    return null;
  }

  return (
    <div className="w-full pb-3">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
        Charge Distribution by Line
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#9ca3af' }}>
        Based on individual line totals and account-level charges
      </Typography>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full items-stretch">
        {/* amCharts 3D Pie Chart */}
        <AnimatedCard delay={delay} className="flex">
          <Card sx={{ backgroundColor: '#1f2937', color: 'white', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                Distribution Chart
              </Typography>
              <div 
                ref={chartRef}
                style={{ width: '100%', height: '400px', flexGrow: 1 }}
              />
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Percentage Table */}
        <AnimatedCard delay={delay + 200} className="flex">
          <Card sx={{ backgroundColor: '#1f2937', color: 'white', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                Breakdown by Percentage
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#9ca3af' }}>
                Line charges and late fees distribution
              </Typography>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Table size="small" sx={{ height: 'fit-content' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'white', borderColor: '#374151' }}>Line</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'white', borderColor: '#374151' }}>Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'white', borderColor: '#374151' }}>Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partitionData.map((entry: PartitionDataItem, index: number) => (
                      <TableRow key={`partition-${index}`}>
                        <TableCell sx={{ verticalAlign: 'middle', color: 'white', borderColor: '#374151' }}>
                          <div>
                            <Typography variant="body2" fontWeight={500} sx={{ color: 'white' }}>
                              {entry.displayName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                              {entry.phone}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'middle', color: 'white', borderColor: '#374151' }}>
                          <Typography variant="body2" fontWeight={500} sx={{ color: 'white' }}>
                            ${entry.amount.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'middle', color: 'white', borderColor: '#374151' }}>
                          <div className="flex items-center justify-end gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <Typography variant="body2" fontWeight={500} sx={{ minWidth: '40px', color: 'white' }}>
                              {entry.percentage}%
                            </Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow sx={{ borderTop: '2px solid #374151' }}>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'middle', color: 'white', borderColor: '#374151' }}>
                        Total Individual Account Charges
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, verticalAlign: 'middle', color: 'white', borderColor: '#374151' }}>
                        ${partitionData.reduce((sum: number, entry: PartitionDataItem) => sum + entry.amount, 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, verticalAlign: 'middle', color: 'white', borderColor: '#374151' }}>
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-3 h-3 flex-shrink-0" /> {/* Spacer for alignment */}
                          <Typography variant="body2" fontWeight={600} sx={{ minWidth: '40px', color: 'white' }}>
                            100.0%
                          </Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </div>
  );
};

export default VisualDistribution;