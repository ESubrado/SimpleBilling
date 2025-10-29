"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import config from "@/config/api";
import Navigation from "@/components/navigation";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setIsRegistering(true);
    try {
    //   const response = await fetch(`${config.backend.baseUrl}/register`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ email, password }),
    //   });
    //   const data = await response.json();
    //   if (!response.ok) {
    //     throw new Error(data.message || "Registration failed");
    //   }
      setSuccess("Registration successful! You can now log in.");
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <>
      <Navigation />
      <AnimatedBackground />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-black text-white">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-center w-full">
          <h1 className="text-4xl font-bold text-center sm:text-left text-white">Register</h1>
          <form onSubmit={handleRegister} className="flex flex-col gap-4 w-full max-w-md mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="block w-full text-sm border rounded-md p-2 bg-gray-800 text-white border-gray-400"
              disabled={isRegistering}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="block w-full text-sm border rounded-md p-2 bg-gray-800 text-white border-gray-400"
              disabled={isRegistering}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="block w-full text-sm border rounded-md p-2 bg-gray-800 text-white border-gray-400"
              disabled={isRegistering}
            />
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {success && (
              <div className="text-green-400 text-sm">
                {success} <a href="/login" className="text-blue-400 underline ml-2">Go to Login</a>
              </div>
            )}
            {!success && (
              <Button
                variant="contained"
                color="secondary"
                type="submit"
                sx={{
                  mt: 2,
                  width: "100%",
                  backgroundColor: "#6B7280",
                  color: "white",
                  '&:hover': { backgroundColor: "#4B5563" },
                  '&:disabled': { backgroundColor: "#1F2937", color: "#9CA3AF" }
                }}
                disabled={isRegistering}
                startIcon={isRegistering ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isRegistering ? "Registering..." : "Register"}
              </Button>
            )}
          </form>
        </main>
      </div>
    </>
  );
}
