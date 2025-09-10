"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeLoginPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인 실패");
      } else if (data.redirectTo) {
        // 하드 내비게이션으로 쿠키 반영을 보장
        window.location.href = data.redirectTo;
      } else {
        window.location.href = "/employee";
      }
    } catch (err) {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kathario</h1>
          <h2 className="text-lg font-semibold text-gray-700">직원 로그인</h2>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="직원 아이디"
            className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-150 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
          {error && <div className="text-red-600 text-sm text-center mt-2 p-2 bg-red-50 rounded-lg">{error}</div>}
        </form>
        <div className="text-center">
          <a href="/employee/forgot-password" className="text-green-600 hover:text-green-700 hover:underline text-sm font-medium transition-colors">비밀번호를 잊으셨나요?</a>
        </div>
      </div>
    </main>
  );
}

