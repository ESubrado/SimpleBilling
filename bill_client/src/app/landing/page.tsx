"use client";
import React, { useEffect, useState } from "react";
import Navigation from "@/components/navigation";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import { useRouter } from "next/navigation";

import config from "@/config/api"; 

export default function Landing() {
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(7);
  const router = useRouter();

  useEffect(() => {
    async function fetchAccountNumbers() {
      try {
        // Call your backend API to get the list of accounts
        const res = await fetch(
            `${config.backend.baseUrl}/billing-accounts`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          // If your API returns objects, extract the account_number field
          setAccountNumbers(data.accounts.map((acc: any) => acc.account_number));
        } else {
          setAccountNumbers([]);
        }
      } catch (err) {
        setAccountNumbers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAccountNumbers();
  }, []);

  // Redirect to home if no account numbers found after 7 seconds
  useEffect(() => {
    if (!loading && accountNumbers.length === 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loading, accountNumbers, router]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8">
        <h1 className="text-3xl font-bold mb-6">Available Account Numbers</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="w-full flex justify-center">
            <div
              className={`grid gap-6 max-w-md w-full
                ${
                  accountNumbers.length === 1
                    ? "grid-cols-1 justify-items-center"
                    : accountNumbers.length === 2
                    ? "grid-cols-2 justify-items-center"
                    : "grid-cols-2 sm:grid-cols-3"
                }
              `}
            >
              {accountNumbers.length === 0 ? (
                <Card sx={{ bgcolor: "#1f2937", color: "white" }}>
                  <CardContent>
                    <Typography>No account numbers found.</Typography>
                    <Typography sx={{ mt: 2, color: "#60a5fa" }}>
                      Redirecting to home in {countdown} seconds...
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                accountNumbers.map((num) => (
                  <Card
                    key={num}
                    onClick={() => router.push(`/history?account=${encodeURIComponent(num)}`)}
                    sx={{
                      bgcolor: "#23272f",
                      color: "white",
                      borderRadius: 4,
                      boxShadow: 6,
                      width: 220,
                      height: 220,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      border: "2px solid #60a5fa",
                      "&:hover": {
                        transform: "scale(1.07)",
                        boxShadow: 10,
                        borderColor: "#38bdf8",
                        background: "linear-gradient(135deg, #1e293b 60%, #23272f 100%)",
                      },
                    }}
                    elevation={6}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 0,
                        "&:last-child": { pb: 0 },
                        height: "100%",
                        width: "100%",
                      }}
                    >
                      <PhoneIphoneIcon sx={{ color: "#60a5fa", fontSize: 44, mb: 1 }} />
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          letterSpacing: 1,
                          textAlign: "center",
                          wordBreak: "break-all",
                          fontSize: 18,
                          mt: 1,
                        }}
                      >
                        {num}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}