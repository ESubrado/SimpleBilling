'use client';

import React, { useEffect, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { useRouter, useSearchParams } from "next/navigation";

import Navigation from "@/components/navigation";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import AnimatedBackground from "@/components/AnimatedBackground";

import config from "@/config/api";
import { colorPalette } from "../results/interfaces";

// Helper for chart root disposal
function disposeRoots(roots: am5.Root[]) {
    roots.forEach(r => r.dispose());
}

// --- Helper for per-entry chart: format billing period and extract year ---
function formatEntryBillingPeriod(period: string): string {
    // Extract only month and year, remove any day/date info
    if (!period) return "";
    // Match month and year (e.g., "Jan 2025", "January 2025")
    const match = period.match(/([A-Za-z]+)\s*(\d{4})/);
    if (match) {
        const month = match[1];
        const year = match[2];
        return `${month} ${year}`;
    }
    // If no year, try to extract from second part
    const parts = period.split("-");
    if (parts.length > 1) {
        const monthMatch = parts[0].trim().match(/([A-Za-z]+)/);
        const yearMatch = parts[1].trim().match(/\d{4}/);
        if (monthMatch && yearMatch) {
            return `${monthMatch[1]} ${yearMatch[0]}`;
        }
    }
    return period.trim();
}

// --- Helper for per-entry chart: parse billing period date ---
function parseEntryBillingPeriodDate(period: string): number {
    const match = period.match(/([A-Za-z]+)\s*(\d{4})/);
    if (match) {
        const month = match[1];
        const year = match[2];
        return new Date(`${month} 1, ${year}`).getTime();
    }
    const parsed = Date.parse(period);
    return isNaN(parsed) ? 0 : parsed;
}

export default function HistoryPage() {
    const [latestInvoice, setLatestInvoice] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [noData, setNoData] = useState(false);
    const [countdown, setCountdown] = useState(5); // Add countdown state
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get account number from query param, fallback to default if not present
    const accountNumber = searchParams.get("account") || "0000000";

    useEffect(() => {
        fetch(`${config.backend.baseUrl}/billing-data/${encodeURIComponent(accountNumber)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.invoices) && data.invoices.length > 0) {
                    setLatestInvoice(data.invoices);
                    setNoData(false);
                } else {
                    setLatestInvoice([]);
                    setNoData(true);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                setNoData(true);
            });
    }, [accountNumber]);

    useEffect(() => {
        if (noData) {
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
    }, [noData, router]);

    // create charts after DOM mounts and clean up on unmount
    useEffect(() => {
        const roots: am5.Root[] = [];

        const timeout = setTimeout(() => {
            // Create line chart for latest invoice data
            const lineEl = document.getElementById("line-chart-main");
            if (lineEl && Array.isArray(latestInvoice) && latestInvoice.length > 0) {
                // Format billing period (e.g., "Jan 2025 - Feb 2025" -> "Jan 2025")
                const formatBillingPeriod = (period: string) => {
                    if (!period) return "";
                    const parts = period.split("-");
                    const firstPart = parts[0].trim();
                    const match = firstPart.match(/([A-Za-z]+)\s*(\d{4})?/);
                    if (match) {
                        const month = match[1];
                        const year = match[2] || "";
                        if (!year && parts.length > 1) {
                            const secondMatch = parts[1].trim().match(/\d{4}/);
                            if (secondMatch) {
                                return `${month} ${secondMatch[0]}`;
                            }
                        }
                        return year ? `${month} ${year}` : month;
                    }
                    return firstPart;
                };

                // Helper to parse "Jan 2025" to a numeric timestamp for sorting
                const parseBillingPeriodDate = (period: string) => {
                    const match = period.match(/([A-Za-z]+)\s*(\d{4})/);
                    if (match) {
                        const month = match[1];
                        const year = match[2];
                        return new Date(`${month} 1, ${year}`).getTime();
                    }
                    const parsed = Date.parse(period);
                    return isNaN(parsed) ? 0 : parsed;
                };

                const chartData = latestInvoice
                    .map(inv => ({
                        billing_period: formatBillingPeriod(inv.billing_period || inv.summary?.billing_period || ""),
                        total_charges: inv.total_charges
                            ? Number(inv.total_charges.toString().replace(/[^0-9.-]+/g,""))
                            : inv.summary?.total_charges
                                ? Number(inv.summary.total_charges.toString().replace(/[^0-9.-]+/g,""))
                                : 0,
                        account_number: inv.account_number || "",
                        invoice_number: inv.invoice_number || ""
                    }))
                    .sort((a, b) => parseBillingPeriodDate(a.billing_period) - parseBillingPeriodDate(b.billing_period));

                const root = am5.Root.new("line-chart-main");
                roots.push(root);
                root.setThemes([am5themes_Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: false,
                        panY: false,
                        wheelX: "none",
                        wheelY: "none",
                    })
                );

                // X Axis: Billing Period
                const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
                xRenderer.labels.template.setAll({ fill: am5.color(0xffffff) });
                const xAxis = chart.xAxes.push(
                    am5xy.CategoryAxis.new(root, {
                        categoryField: "billing_period",
                        renderer: xRenderer
                    })
                );

                // Y Axis: Total Charges
                const yRenderer = am5xy.AxisRendererY.new(root, {});
                yRenderer.labels.template.setAll({ fill: am5.color(0xffffff) });
                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, { renderer: yRenderer })
                );

                // --- Overall Amount Over Time (Account Number) ---
                const series = chart.series.push(
                    am5xy.LineSeries.new(root, {
                        name: "Total Charges",
                        xAxis,
                        yAxis,
                        valueYField: "total_charges",
                        categoryXField: "billing_period",
                        tooltip: am5.Tooltip.new(root, { 
                            labelText: "Account: {account_number}\n{categoryX}: ${valueY.formatNumber('#.##')}" 
                        })
                    })
                );
                // Assign color from palette (first color for overall chart)
                series.strokes.template.setAll({ strokeWidth: 4, stroke: am5.color(colorPalette[0]) });
                // Show invoice number at each billing period
                series.bullets.push(() =>
                    am5.Bullet.new(root, {
                        locationY: 0,
                        sprite: am5.Label.new(root, {
                            text: "{total_charges} ({invoice_number})",
                            populateText: true,
                            fill: am5.color(0xffffff),
                            centerY: am5.percent(100),
                            centerX: am5.percent(50),
                            fontSize: 12,
                            dy: -10
                        })
                    })
                );
                series.data.setAll(chartData);
                xAxis.data.setAll(chartData);               

                chart.appear(500, 500);
            }

            // --- NEW: Per-entry line chart ---
            const entryLineEl = document.getElementById("line-chart-entries");
            if (
                entryLineEl &&
                Array.isArray(latestInvoice) &&
                latestInvoice.length > 0 &&
                latestInvoice.some(inv => Array.isArray(inv.entries) && inv.entries.length > 0)
            ) {
                // Build data: [{billing_period, entry_name, total_charges, phone}]
                let entryChartData: { billing_period: string; entry_name: string; total_charges: number; phone: string }[] = [];
                latestInvoice.forEach(inv => {
                    const billing_period = formatEntryBillingPeriod(inv.billing_period || inv.summary?.billing_period || "");
                    if (Array.isArray(inv.entries)) {
                        inv.entries.forEach((entry: any) => {
                            let charge = 0;
                            if (typeof entry.total_charges !== "undefined" && entry.total_charges !== null) {
                                charge = Number(entry.total_charges.toString().replace(/[^0-9.-]+/g, ""));
                            } else if (typeof entry.total_current_charges !== "undefined" && entry.total_current_charges !== null) {
                                charge = Number(entry.total_current_charges.toString().replace(/[^0-9.-]+/g, ""));
                            } else if (Array.isArray(entry.money_amounts)) {
                                const found = entry.money_amounts.find((m: any) => m.keyword === "Total Current Charges" && m.amount);
                                if (found) {
                                    charge = Number(found.amount.toString().replace(/[^0-9.-]+/g, ""));
                                }
                            }
                            entryChartData.push({
                                billing_period,
                                phone: entry.phone || "",
                                entry_name: entry.name || "",
                                total_charges: charge
                            });
                        });
                    }
                });

                // Get all unique entry names
                const entryNames = Array.from(new Set(entryChartData.map(d => d.entry_name).filter(Boolean)));

                // Sort by billing period
                entryChartData.sort((a, b) => parseEntryBillingPeriodDate(a.billing_period) - parseEntryBillingPeriodDate(b.billing_period));

                // --- NEW: Generate all billing periods from first to last ---
                const allPeriods = (() => {
                    const periods = Array.from(new Set(entryChartData.map(d => d.billing_period).filter(Boolean)));
                    const sortedPeriods = periods.sort((a, b) => parseEntryBillingPeriodDate(a) - parseEntryBillingPeriodDate(b));
                    if (sortedPeriods.length === 0) return [];
                    const startDate = new Date(parseEntryBillingPeriodDate(sortedPeriods[0]));
                    const endDate = new Date(parseEntryBillingPeriodDate(sortedPeriods[sortedPeriods.length - 1]));
                    const result: string[] = [];
                    let current = new Date(startDate);
                    while (current <= endDate) {
                        const month = current.toLocaleString('default', { month: 'short' });
                        const year = current.getFullYear();
                        result.push(`${month} ${year}`);
                        current.setMonth(current.getMonth() + 1);
                    }
                    return result;
                })();

                // Create chart
                const root = am5.Root.new("line-chart-entries");
                roots.push(root);
                root.setThemes([am5themes_Animated.new(root)]);

                const chart = root.container.children.push(
                    am5xy.XYChart.new(root, {
                        panX: false,
                        panY: false,
                        wheelX: "none",
                        wheelY: "none",
                    })
                );

                // X Axis: Billing Period
                const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
                xRenderer.labels.template.setAll({ fill: am5.color(0xffffff) });
                const xAxis = chart.xAxes.push(
                    am5xy.CategoryAxis.new(root, {
                        categoryField: "billing_period",
                        renderer: xRenderer
                    })
                );

                // Y Axis: Total Charges
                const yRenderer = am5xy.AxisRendererY.new(root, {});
                yRenderer.labels.template.setAll({ fill: am5.color(0xffffff) });
                const yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(root, { renderer: yRenderer })
                );

                // Add a line series for each entry name
                entryNames.forEach((entryName, idx) => {
                    const color = am5.color(colorPalette[idx % colorPalette.length]);
                    const series = chart.series.push(
                        am5xy.LineSeries.new(root, {
                            name: entryName,
                            xAxis,
                            yAxis,
                            valueYField: "total_charges",
                            categoryXField: "billing_period",
                            tooltip: am5.Tooltip.new(root, {
                                labelText: "{name}: {total_charges}\n{categoryX}" // Removed dollar sign
                            })
                        })
                    );
                    // Set vibrant color for the line and legend
                    series.set("stroke", color);
                    series.strokes.template.setAll({ strokeWidth: 3, stroke: color });
                    series.set("fill", color);
                    series.fills.template.setAll({ fill: color, fillOpacity: 0.2 });
                    // Bullets use the same color and show money amount
                    series.bullets.push(() =>
                        am5.Bullet.new(root, {
                            sprite: am5.Label.new(root, {
                                text: "{total_charges}", // Removed dollar sign
                                populateText: true,
                                fill: color,
                                fontSize: 13,
                                centerY: am5.percent(100),
                                centerX: am5.percent(50),
                                dy: -10
                            })
                        })
                    );
                    series.data.setAll(
                        allPeriods.map(period => {
                            const found = entryChartData.find(d => d.entry_name === entryName && d.billing_period === period);
                            return {
                                billing_period: period,
                                total_charges: found ? found.total_charges : 0,
                                name: entryName
                            };
                        })
                    );
                });

                // Set xAxis data to all periods
                xAxis.data.setAll(allPeriods.map(billing_period => ({ billing_period })));

                // Legend (move to right side, vertical)
                const legend = chart.children.push(
                    am5.Legend.new(root, {
                        centerY: am5.percent(50),
                        y: am5.percent(50),
                        x: am5.percent(100),
                        centerX: am5.percent(100),
                        layout: root.verticalLayout,
                        paddingLeft: 50 // Add left margin so legend doesn't overlap chart
                    })
                );
                legend.labels.template.setAll({ fill: am5.color(0xffffff) });
                legend.valueLabels.template.setAll({ fill: am5.color(0xffffff) });
                legend.data.setAll(chart.series.values);

                chart.appear(500, 500);
            }
        }, 0);

        return () => {
            clearTimeout(timeout);
            disposeRoots(roots);
        };
    }, [latestInvoice]);

    return (
        <>
            <Navigation />
            <AnimatedBackground />
            <ScrollToTopButton />
            <div className="font-sans grid items-center justify-items-center min-h-screen px-8 pt-12 pb-20 gap-16 w-full bg-black text-white">
                <main className="flex flex-col gap-6 row-start-2 items-center w-full max-w-screen-2xl">
                    {noData && (
                        <div className="bg-red-600 text-white px-6 py-3 rounded mb-4 text-center font-semibold">
                            No data available. Redirecting to home page in {countdown} seconds...
                        </div>
                    )}
                    <h2 className="text-4xl font-bold text-center sm:text-left text-white mb-6">
                        Bill History Dashboard For Account: {accountNumber}
                    </h2>

                    {/* Line Graph + Table Row */}
                    <section className="w-full mb-10">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full items-center">
                            {/* Line Graph (3/4 width) */}
                            <div className="md:col-span-7 bg-gray-900 rounded-lg shadow p-4 flex flex-col items-center h-[340px]">
                                <h3 className="text-lg font-semibold mb-2 text-white">Overall Amount Over Time (Account Number)</h3>
                                <div id="line-chart-main" className="w-full h-[280px]" />
                            </div>
                            {/* Table (1/4 width) */}
                            <div className="md:col-span-5 bg-gray-900 rounded-lg shadow p-4 flex flex-col items-center h-[340px]">
                                <h3 className="text-lg font-semibold mb-2 text-white">Bill Summary</h3>
                                <table className="w-full text-white text-sm">
                                    <thead>
                                        <tr>
                                            <th className="py-1 px-2 text-left">Invoice Number</th>
                                            <th className="py-1 px-2 text-left">Billing Period</th>
                                            <th className="py-1 px-2 text-right">Total Charges ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={3} className="py-2 text-center">Loading...</td>
                                            </tr>
                                        ) : Array.isArray(latestInvoice) && latestInvoice.length > 0 ? (
                                            latestInvoice.map((invoice: any, idx: number) => (
                                                <tr key={invoice.invoice_number || idx}>
                                                    <td
                                                      className="py-1 px-2 text-blue-400 hover:underline cursor-pointer"
                                                      onClick={() => {
                                                        if (invoice.invoice_number) {
                                                          router.push(`/results?invoice=${encodeURIComponent(invoice.invoice_number)}`);
                                                        }
                                                      }}
                                                    >
                                                      {invoice.invoice_number || ""}
                                                    </td>
                                                    <td className="py-1 px-2">{invoice.billing_period || invoice.summary?.billing_period || ""}</td>
                                                    <td className="py-1 px-2 text-right">
                                                        {invoice.total_charges
                                                            ? Number(invoice.total_charges.toString().replace(/[^0-9.-]+/g,"")).toFixed(2)
                                                            : invoice.summary?.total_charges
                                                                ? Number(invoice.summary.total_charges.toString().replace(/[^0-9.-]+/g,"")).toFixed(2)
                                                                : ""}
                                                    </td>
                                                </tr>
                                                
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-2 text-center">No data found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* --- NEW: Per-entry line chart row --- */}
                    <section className="w-full mb-10">
                        <div className="bg-gray-900 rounded-lg shadow p-4 flex flex-col items-center h-[540px]">
                            <h3 className="text-lg font-semibold mb-2 text-white">
                                Line Graph Per Entry (Total Charges Over Time)
                            </h3>
                            <div id="line-chart-entries" className="w-full h-[480px]" />
                        </div>
                    </section>                  
                </main>
            </div>
        </>
    );
}