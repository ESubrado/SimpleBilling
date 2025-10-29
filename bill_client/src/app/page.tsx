"use client";
import Navigation from "@/components/navigation";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useAppDispatch } from "@/hooks/redux";
import {setPdfData, setError, clearPdfData } from "@/store/pdfSlice";

import config from "@/config/api";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  //used to get summary and contact info from pdf
  const [pageRange, setPageRange] = useState<string>("1-7"); // Default to first 7 pages
 
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    setSelectedFile(fileList && fileList.length > 0 ? fileList[0] : null);
  };  

  const handleGoToResults = async () => {
    if (!selectedFile) return;

    // Check for session (token in localStorage)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      alert('You must be logged in to analyze a bill.');
      router.push('/login');
      return;
    }

    dispatch(clearPdfData());
    setIsLocalProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Add page range if provided
      if (pageRange.trim()) {
        formData.append("pageRange", pageRange.trim());
      }

      // Use bill_server extract-text endpoint
      const response = await fetch(`${config.backend.baseUrl}${config.backend.endpoints.extractText}`, {
        method: "POST",
        body: formData,
        headers: {
          // Attach token if needed by backend
          Authorization: `Bearer ${token}`
        }
      });

      const json = await response.json();

      if (!response.ok) {
        // Check if the response contains error details from server
        const serverMessage = json.message || `HTTP error! status: ${response.status}`;
        throw new Error(serverMessage);
      }

      dispatch(setPdfData(json));
      setSelectedFile(null);
      setPageRange("");

    } catch (error) {
      console.error("Error processing PDF:", error);

      // Check if it's an invalid document error
      const errorMessage = error instanceof Error ? error.message : "Failed to process PDF";
      const isInvalidDocument = errorMessage.includes("Invalid document");

      if (isInvalidDocument) {
        dispatch(setError("Invalid document: This application currently supports Verizon bills only. Other carriers will be added soon."));
      } else {
        dispatch(setError(errorMessage));
      }
    } finally {
      setIsLocalProcessing(false);
      router.push("/results");
    }
  };

  return (
    <>
      <Navigation />
      <AnimatedBackground />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-black text-white">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-center">
          <h1 className="text-4xl font-bold text-center sm:text-left text-white">
            Welcome to Simplify Bill!
          </h1>
          <h1 className="text-xl font-bold text-center sm:text-left text-white">
            See key details — totals, dates, and payments — in one easy view. Please click below to upload and analyze your bill.
          </h1>
          <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              placeholder="Upload a file..."  
              disabled={isLocalProcessing}            
              className={`block w-full text-sm border rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold transition-colors ${
                isLocalProcessing 
                  ? 'text-gray-500 border-gray-600 bg-gray-800 cursor-not-allowed file:bg-gray-700 file:text-gray-500' 
                  : 'text-white border-gray-400 bg-gray-800 file:bg-gray-700 file:text-white hover:file:bg-gray-600'
              }`}
            />   
            <Button
              variant="contained"
              color="primary"
              onClick={handleGoToResults}
              sx={{ 
                mt: 5, 
                width: "100%",
                backgroundColor: "#374151",
                color: "white",
                '&:hover': {
                  backgroundColor: "#4B5563"
                },
                '&:disabled': {
                  backgroundColor: "#1F2937",
                  color: "#6B7280"
                }
              }}
              disabled={!selectedFile || isLocalProcessing}
              startIcon={isLocalProcessing ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLocalProcessing ? "Processing PDF..." : "View Summarized Bill"}
            </Button>
          </div>
        </main>
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
