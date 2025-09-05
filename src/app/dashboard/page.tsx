"use client";

import Link from "next/link";

export default function DashboardPage() {
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // 로그아웃 후 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    } catch (error) {
      console.error('로그아웃 오류:', error);
      // 오류가 발생해도 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Kathario
                </h1>
                <span className="ml-2 text-sm text-gray-600">대시보드</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">안녕하세요, 사장님!</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🎉 Kathario에 오신 것을 환영합니다!
            </h1>
            <p className="text-lg text-gray-600">
              요식업 운영을 스마트하게 만들어보세요
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">체크리스트</h3>
              <p className="text-gray-600 mb-4">준비, 진행, 마감 업무를 체계적으로 관리하세요.</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                곧 출시 예정 →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">재고 관리</h3>
              <p className="text-gray-600 mb-4">실시간 재고 현황과 자동 알림으로 효율적인 관리.</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                곧 출시 예정 →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">직원 관리</h3>
              <p className="text-gray-600 mb-4">직원별 업무 분담과 권한을 효율적으로 관리.</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                곧 출시 예정 →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📖</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">디지털 매뉴얼</h3>
              <p className="text-gray-600 mb-4">작업 절차와 방법을 체계적으로 문서화.</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                곧 출시 예정 →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">안전 관리</h3>
              <p className="text-gray-600 mb-4">위생과 안전 수칙을 체계적으로 관리.</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                곧 출시 예정 →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">분석 리포트</h3>
              <p className="text-gray-600 mb-4">운영 데이터를 분석하여 인사이트 제공.</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                곧 출시 예정 →
              </button>
            </div>
          </div>

          {/* Beta Notice */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                🚀 베타 버전 개발 중
              </h2>
              <p className="text-gray-700 mb-4">
                현재 Kathario SaaS 플랫폼을 열심히 개발하고 있습니다. 
                바삭치킨에서 검증된 시스템을 기반으로 더욱 강력한 기능들을 준비 중이에요!
              </p>
              <div className="flex justify-center space-x-4">
                <Link 
                  href="/"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  홈으로 돌아가기
                </Link>
                <button
                  onClick={handleLogout}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
