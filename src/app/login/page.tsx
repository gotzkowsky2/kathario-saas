"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    employeeId: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      // 브라우저 fetch는 리다이렉트를 자동으로 따릅니다.
      // 최종 응답이 리다이렉트된 경우 대상 URL로 이동
      if (response.redirected && response.url) {
        window.location.href = response.url;
        return;
      }
      
      // 307/308 리다이렉트 (일부 환경 대비, fallback)
      if (response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        if (location) {
          window.location.href = location;
          return;
        }
      }
      
      // 다른 응답인 경우 JSON 파싱 시도
      let data;
      try {
        data = await response.json();
      } catch (e) {
        setError('서버 응답을 처리할 수 없습니다.');
        return;
      }
      
      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }
      
      // 일반적인 성공 응답
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Kathario
            </h1>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              무료로 회원가입
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                직원 ID
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                autoComplete="username"
                required
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="직원 ID를 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  로그인 상태 유지
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    로그인 중...
                  </div>
                ) : (
                  "로그인"
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>
          </div>

          {/* Demo Account */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">🎯 데모 계정으로 체험해보세요</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>관리자:</strong> admin / demo123</p>
              <p><strong>직원:</strong> employee / demo123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>
            로그인하면{" "}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              이용약관
            </Link>
            {" "}및{" "}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
