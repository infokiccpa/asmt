"use client";
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, FileQuestion, ClipboardList, Users, LogOut, Monitor, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { usePathname } from 'next/navigation';

const Sidebar = ({ isAdmin }: { isAdmin: boolean }) => {
  const { logout, user } = useAuth();
  const pathname = usePathname();

  const adminLinks = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Questions', href: '/admin/questions', icon: FileQuestion },
    { name: 'Tests', href: '/admin/tests', icon: ClipboardList },
    { name: 'Monitoring', href: '/admin/monitoring', icon: Monitor },
    { name: 'Users', href: '/admin/users', icon: Users },
    // Only visible to Super Admin
    ...(user?.role === 'Super Admin' ? [
      { name: 'Super Admin', href: '/admin/super-admin', icon: ShieldAlert },
      { name: 'Approvals', href: '/admin/approvals', icon: ShieldCheck }
    ] : []),
  ];

  const links = isAdmin ? adminLinks : [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Results', href: '/student/results', icon: ClipboardList },
  ];

  return (
    <div className="group/sidebar w-16 hover:w-64 sidebar h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300 ease-in-out overflow-hidden">

      {/* Logo */}
      <Link href="/" className="px-4 py-5 flex items-center gap-3 border-b border-gray-100 min-h-[68px] hover:bg-orange-50 transition-colors duration-200">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-black text-sm">C</span>
        </div>
        <span className="text-lg font-black text-gray-900 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
          Clarity
        </span>
      </Link>

      {/* User pill */}
      {user && (
        <div className="mx-2 mt-4 mb-2 px-2 py-3 bg-orange-50 rounded-xl border border-orange-100 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
              <p className="text-xs font-bold text-gray-800 truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      <p className="px-4 mt-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        Navigation
      </p>

      {/* Nav */}
      <div className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.name}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 group/item relative
                  ${isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <link.icon
                  className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover/item:text-orange-500'} transition-colors`}
                  style={{ width: '18px', height: '18px' }}
                />
                <span className={`font-semibold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 ${isActive ? 'text-white' : ''}`}>
                  {link.name}
                </span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-white/70 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-2 border-t border-gray-100">
        <button
          onClick={logout}
          title="Sign Out"
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group/logout"
        >
          <LogOut
            className="flex-shrink-0 group-hover/logout:-translate-x-0.5 transition-transform"
            style={{ width: '18px', height: '18px' }}
          />
          <span className="font-semibold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
