import Link from "next/link";
import { 
  CheckCircleIcon, 
  ClipboardDocumentListIcon, 
  CubeIcon, 
  UsersIcon,
  StarIcon,
  ArrowRightIcon,
  PlayIcon
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🍗</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Kathario</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">기능</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">요금</a>
            <a href="#success-story" className="text-gray-600 hover:text-gray-900 transition-colors">성공사례</a>
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">로그인</Link>
            <Link href="/signup" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105">
              무료 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 text-orange-800 text-sm font-medium mb-6">
              🎉 바삭치킨에서 검증된 시스템
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              요식업 운영을
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                혁신하세요
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              체크리스트, 재고관리, 직원관리를 하나의 플랫폼에서.<br />
              실제 운영으로 검증된 시스템으로 당신의 레스토랑도 효율적으로 운영하세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/signup" className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl">
              🚀 무료로 시작하기
              <ArrowRightIcon className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="group flex items-center justify-center px-8 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-lg hover:border-gray-400 hover:bg-white transition-all">
              <PlayIcon className="w-5 h-5 mr-2" />
              데모 영상 보기
            </button>
          </div>

          {/* Success Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">6명</div>
              <div className="text-gray-600">활성 직원</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">100+</div>
              <div className="text-gray-600">재고 아이템</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">13개</div>
              <div className="text-gray-600">체크리스트 템플릿</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">실시간 운영</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              모든 기능이 하나의 플랫폼에
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              복잡한 요식업 운영을 간단하고 효율적으로 만드는 통합 솔루션
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">스마트 체크리스트</h3>
              <p className="text-gray-600 mb-6">
                홀/주방 업무를 체계적으로 관리하세요. 템플릿 기반으로 반복 작업을 자동화하고 실시간으로 진행상황을 추적합니다.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  자동 반복 생성
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  실시간 진행 추적
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  연결 항목 관리
                </li>
              </ul>
            </div>

            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <CubeIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">실시간 재고관리</h3>
              <p className="text-gray-600 mb-6">
                재료부터 포장재까지 모든 재고를 실시간으로 추적하고 자동 알림으로 품절을 방지하세요.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  자동 재고 알림
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  구매 요청 시스템
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  이력 추적
                </li>
              </ul>
            </div>

            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">직원 관리</h3>
              <p className="text-gray-600 mb-6">
                직원별 권한 관리와 업무 분담을 체계적으로 운영하세요. 각자의 역할에 맞는 기능만 제공합니다.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  권한별 접근 제어
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  업무 분담 관리
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  성과 추적
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Success Story Section */}
      <section id="success-story" className="py-20 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              실제 성공사례: 바삭치킨
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Kathario로 운영 효율성을 혁신한 바삭치킨의 실제 사례를 확인하세요
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center mb-6">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="w-6 h-6 fill-current" />
                    ))}
                  </div>
                  <span className="ml-3 text-gray-600 font-medium">실제 운영 중인 매장</span>
                </div>
                
                <blockquote className="text-2xl text-gray-900 font-medium mb-8 leading-relaxed">
                  "Kathario 도입 후 업무 효율성이 300% 향상되었습니다. 
                  체크리스트로 빠뜨리는 업무가 없어졌고, 재고관리가 자동화되어 
                  품절 사고가 완전히 사라졌어요."
                </blockquote>
                
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">배</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">배재범 사장님</div>
                    <div className="text-gray-600">바삭치킨 대표</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">300%</div>
                  <div className="text-gray-700">업무 효율성 향상</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">0건</div>
                  <div className="text-gray-700">품절 사고</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">6명</div>
                  <div className="text-gray-700">활성 직원</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
                  <div className="text-gray-700">실시간 운영</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              간단하고 투명한 요금제
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              매장 규모에 맞는 요금제를 선택하세요. 언제든지 변경 가능합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">스타터</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">무료</span>
                <span className="text-gray-600 ml-2">/ 월</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  직원 3명까지
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  기본 체크리스트
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  재고 50개까지
                </li>
              </ul>
              <Link href="/signup" className="w-full block text-center py-3 px-6 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-all">
                무료 시작하기
              </Link>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  추천
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4">프로</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">₩49,000</span>
                <span className="opacity-80 ml-2">/ 월</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-blue-200 mr-3" />
                  무제한 직원
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-blue-200 mr-3" />
                  고급 체크리스트
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-blue-200 mr-3" />
                  무제한 재고관리
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-blue-200 mr-3" />
                  실시간 알림
                </li>
              </ul>
              <Link href="/signup" className="w-full block text-center py-3 px-6 rounded-lg bg-white text-blue-600 font-semibold hover:bg-gray-50 transition-all">
                프로 시작하기
              </Link>
            </div>

            <div className="p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">엔터프라이즈</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₩99,000</span>
                <span className="text-gray-600 ml-2">/ 월</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  다중 매장 관리
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  고급 분석 리포트
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  API 연동
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                  전담 지원
                </li>
              </ul>
              <Link href="/signup" className="w-full block text-center py-3 px-6 rounded-lg border-2 border-purple-600 text-purple-600 font-semibold hover:bg-purple-50 transition-all">
                문의하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            지금 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            바삭치킨처럼 성공하는 레스토랑이 되어보세요. 
            무료로 시작해서 효과를 직접 경험해보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg">
              🚀 무료로 시작하기
            </Link>
            <Link href="/login" className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all">
              데모 체험하기
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🍗</span>
                </div>
                <span className="text-xl font-bold">Kathario</span>
              </div>
              <p className="text-gray-400">
                요식업 운영을 혁신하는 통합 플랫폼
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">기능</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">요금</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">도움말</a></li>
                <li><a href="#" className="hover:text-white transition-colors">문의하기</a></li>
                <li><a href="#" className="hover:text-white transition-colors">상태</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">소개</a></li>
                <li><a href="#" className="hover:text-white transition-colors">블로그</a></li>
                <li><a href="#" className="hover:text-white transition-colors">채용</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Kathario. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}