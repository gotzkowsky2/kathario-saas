"use client";
import Link from "next/link";
import { useCallback, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

interface Employee {
  name: string;
  department: string;
  position: string;
  isSuperAdmin: boolean;
  tenantId: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname?.startsWith("/employee/login");

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch("/api/employee/me", { credentials: "include", cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setEmployee(data);
          
          // 테넌트 정보도 가져오기
          if (data.tenantId) {
            try {
              const tenantResponse = await fetch(`/api/tenant/${data.tenantId}`, { credentials: "include" });
              if (tenantResponse.ok) {
                const tenantData = await tenantResponse.json();
                setTenant(tenantData);
              }
            } catch (tenantError) {
              console.error("테넌트 정보 조회 실패:", tenantError);
            }
          }
        } else {
          // 인증 실패 시 로그인 페이지로 리다이렉트
          console.log("인증 실패, 로그인 페이지로 리다이렉트");
          window.location.href = "/employee/login";
          return;
        }
      } catch (error) {
        console.error("직원 정보 조회 실패:", error);
        // 네트워크 오류 등의 경우에도 로그인 페이지로 리다이렉트
        window.location.href = "/employee/login";
        return;
      } finally {
        setLoading(false);
      }
    };

    if (!isLoginPage) {
      fetchEmployee();
    } else {
      setLoading(false);
    }
  }, [isLoginPage]);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/employee/logout", { method: "POST", credentials: "include", keepalive: true });
    // 로그아웃 직후 상단 메뉴/사용자 정보가 보이지 않도록 즉시 UI 초기화
    setEmployee(null);
    setShowMenu(false);
    window.location.replace("/employee/login");
  }, []);

  const getDropdownPosition = useCallback(() => {
    if (!menuButtonRef.current) return { top: 0, left: 0 };
    const rect = menuButtonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 4, // 버튼 아래 4px 간격
      left: rect.left,
    };
  }, []);

  // 로그인 페이지에서는 상단 메뉴/헤더를 완전히 숨김
  if (isLoginPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-visible">
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 overflow-visible">
        {/* 홈 아이콘 */}
        <div className="flex items-center gap-1 sm:gap-3 overflow-visible">
          <Link 
            href="/employee" 
            prefetch={false} 
            className="home-icon flex items-center gap-2 text-green-700 hover:text-green-900 active:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-lg p-1 -m-1 font-bold text-sm sm:text-lg transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125h3.375a1.125 1.125 0 001.125-1.125V16.5a1.125 1.125 0 011.125-1.125h2.25A1.125 1.125 0 0115.75 16.5v3.375c0 .621.504 1.125 1.125 1.125h3.375a1.125 1.125 0 001.125-1.125V9.75" />
            </svg>
            <span className="hidden sm:inline">Kathario</span>
          </Link>
          
          {/* 대시보드 메뉴 드롭다운 */}
          {!!employee && (
            <div className="relative overflow-visible">
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-150 min-h-[36px] sm:min-h-[44px] min-w-[80px] sm:min-w-[120px]"
                title="대시보드 메뉴"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <span className="hidden sm:inline">메뉴</span>
                <svg 
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse">
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
                <div className="w-12 h-3 bg-gray-200 rounded mt-1"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          ) : employee ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm text-gray-600 hidden md:block">
                <div className="font-medium">{employee.name}님</div>
                <div className="text-xs text-gray-500">
                  {employee.department} • {employee.position}
                  {tenant && <span className="ml-1">@ {tenant.name}</span>}
                </div>
              </div>
              
              {/* 모바일에서도 기본 정보 표시 */}
              <div className="text-xs text-gray-600 block md:hidden">
                <div className="font-medium text-center">{employee.name}</div>
                {tenant && <div className="text-xs text-gray-500 text-center">{tenant.name}</div>}
              </div>
              
              {/* 직원 아이콘 */}
              {!employee?.isSuperAdmin && (
                <span className="text-lg sm:text-2xl">🧑‍🍳</span>
              )}
            </div>
          ) : null}
          
          {/* 관리자인 경우에만 관리자 페이지로 이동하는 아이콘 표시 */}
          {!loading && employee && employee.isSuperAdmin && (
             <Link 
              href="/dashboard" prefetch={false}
              className="p-2 sm:p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:text-blue-700 active:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-all duration-150 min-h-[32px] sm:min-h-[44px] min-w-[32px] sm:min-w-[44px] flex items-center justify-center"
              title="관리자 페이지로 이동"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-6 sm:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </Link>
          )}
          
          {!!employee && (
            <button
              onClick={handleLogout}
              className="p-2 sm:p-3 text-gray-600 hover:text-red-600 hover:bg-red-50 active:text-red-700 active:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-lg transition-all duration-150 min-h-[32px] sm:min-h-[44px] min-w-[32px] sm:min-w-[44px] flex items-center justify-center"
              title="로그아웃"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-6 sm:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          )}
        </div>
      </header>
      
      <main>{children}</main>

      {/* Portal로 렌더링되는 드롭다운 메뉴 */}
      {mounted && showMenu && createPortal(
        <div
          ref={menuRef}
          data-dropdown="true"
          className="dropdown-menu fixed w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999] animate-in fade-in-0 zoom-in-95 duration-100"
          style={getDropdownPosition()}
        >
          <Link 
            href="/employee/checklist" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 active:bg-green-100 focus:outline-none focus:bg-green-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            오늘의 체크리스트
          </Link>
          <Link 
            href="/employee/submissions" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 focus:outline-none focus:bg-blue-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            내 제출 내역
          </Link>
          <Link 
            href="/employee/notices" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 active:bg-yellow-100 focus:outline-none focus:bg-yellow-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            주의사항
          </Link>
          <Link 
            href="/employee/inventory" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 focus:outline-none focus:bg-blue-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            재고/구매관리
          </Link>
          <Link 
            href="/employee/inventory/stale" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 focus:outline-none focus:bg-blue-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5M12 3.75a8.25 8.25 0 108.25 8.25A8.25 8.25 0 0012 3.75z" />
            </svg>
            재고(업데이트 필요)
          </Link>
          <Link 
            href="/employee/manual" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 focus:outline-none focus:bg-indigo-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            메뉴얼
          </Link>
          <Link 
            href="/employee/favorites" 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-pink-50 hover:text-pink-700 active:bg-pink-100 focus:outline-none focus:bg-pink-50 transition-all duration-150 cursor-pointer min-h-[44px]"
            onClick={() => setShowMenu(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-pink-600">
              <path d="M11.645 20.91l-.007-.003-.022-.01a15.247 15.247 0 01-.383-.173 25.18 25.18 0 01-4.244-2.673C4.688 16.18 2.25 13.514 2.25 9.75 2.25 7.126 4.338 5 6.75 5c1.676 0 3.163.992 3.9 2.41.737-1.418 2.224-2.41 3.9-2.41 2.412 0 4.5 2.126 4.5 4.75 0 3.764-2.438 6.43-4.739 8.3a25.175 25.175 0 01-4.244 2.673 15.247 15.247 0 01-.383.173l-.022.01-.007.003-.003.001a.75.75 0 01-.614 0l-.003-.001z" />
            </svg>
            즐겨찾기
          </Link>
        </div>,
        document.body
      )}
    </div>
  );
}
