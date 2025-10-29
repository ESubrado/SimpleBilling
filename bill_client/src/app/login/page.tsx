"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import config from "@/config/api";
import Navigation from "@/components/navigation";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
    //   const response = await fetch(`${config.backend.baseUrl}/login`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ email, password }),
    //   });
    //   const data = await response.json();
    //   if (!response.ok) {
    //     throw new Error(data.message || "Login failed");
    //   }
      // Optionally store token: localStorage.setItem('token', data.token);
      setEmail("");
      setPassword("");
      router.push("/");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <Navigation />
      <AnimatedBackground />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-black text-white">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-center w-full">
          <h1 className="text-4xl font-bold text-center sm:text-left text-white">Login to Simplify Bill</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-md mx-auto p-8 rounded-lg shadow-lg">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="block w-full text-sm border rounded-md p-2 bg-gray-800 text-white border-gray-400"
              disabled={isLoggingIn}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="block w-full text-sm border rounded-md p-2 bg-gray-800 text-white border-gray-400"
              disabled={isLoggingIn}
            />
            {loginError && <div className="text-red-400 text-sm">{loginError}</div>}
            <Button
              variant="contained"
              color="primary"
              type="submit"
              sx={{
                mt: 2,
                width: "100%",
                backgroundColor: "#374151",
                color: "white",
                '&:hover': { backgroundColor: "#4B5563" },
                '&:disabled': { backgroundColor: "#1F2937", color: "#6B7280" }
              }}
              disabled={isLoggingIn}
              startIcon={isLoggingIn ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="w-full max-w-md mx-auto mt-8 text-center">
            <span className="text-white">Don't have an account?</span>{' '}
            <a href="/register" className="text-blue-400 hover:underline">Register here</a>
          </div>
        </main>
      </div>
    </>
  );
}
