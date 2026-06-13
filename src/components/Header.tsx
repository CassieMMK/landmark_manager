import React from 'react';
import { AppTab } from '../types';
import { LogIn, ChevronDown, LogOut, User, Menu, X } from 'lucide-react';
import { DbStatus, RedisStatus } from '../App';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentTab: AppTab;
  setTab: (tab: AppTab) => void;
  dbStatus: DbStatus;
  redisStatus: RedisStatus;
  redisGeoCount: number | null;
}

// Always-visible tabs
const BASE_TABS: { key: AppTab; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'list', label: 'List' },
  { key: 'add', label: 'Add' },
  { key: 'route', label: 'Route' },
  { key: 'trip', label: 'Trip' },
];

// Tabs shown only when logged in
const AUTH_TABS: { key: AppTab; label: string }[] = [
  { key: 'favorites', label: 'Favorites' },
  { key: 'history', label: 'History' },
];

export default function Header({ currentTab, setTab, dbStatus, redisStatus, redisGeoCount }: HeaderProps) {
  const { user, signOut, openAuthModal, requireAuth } = useAuth();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  const handleAuthTab = (tab: AppTab) => {
    requireAuth(() => setTab(tab));
  };

  const handleTabClick = (tab: AppTab) => {
    setTab(tab);
    setMobileMenuOpen(false);
  };

  const allTabs = user ? [...BASE_TABS, ...AUTH_TABS] : BASE_TABS;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm" id="header-nav">
      <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
          </button>

          <button
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-2 md:gap-2.5 text-lg md:text-xl font-bold tracking-tight text-[#003da6] transition-transform active:scale-98"
          >
            <span className="relative flex h-5 w-5 items-center justify-center bg-[#003da6] text-white text-xs font-black rounded-sm shadow-sm">
              L
            </span>
            <span className="font-extrabold select-none hidden sm:inline">Landmark Manager</span>
            <span className="font-extrabold select-none sm:hidden">LM</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" id="navbar-links">
            {BASE_TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`pb-1 text-sm font-medium tracking-wide transition-all border-b-2 ${
                  currentTab === item.key
                    ? 'text-[#003da6] border-[#003da6] font-semibold'
                    : 'text-gray-500 border-transparent hover:text-[#003da6]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {user && <div className="w-px h-5 bg-gray-200" />}

            {user && AUTH_TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`pb-1 text-sm font-medium tracking-wide transition-all border-b-2 ${
                  currentTab === item.key
                    ? 'text-[#003da6] border-[#003da6] font-semibold'
                    : 'text-gray-500 border-transparent hover:text-[#003da6]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {!user && AUTH_TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => handleAuthTab(item.key)}
                className="pb-1 text-sm font-medium tracking-wide text-gray-400 border-b-2 border-transparent hover:text-[#003da6] transition-all"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* DB status pill */}
          <div
            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3.5 py-1.5 rounded-full border ${
              dbStatus === 'connected'
                ? 'bg-[#78fbbb]/15 border-[#006c47]/10'
                : dbStatus === 'connecting'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
            }`}
            id="db-status-pill"
          >
            <span className="relative flex h-2 w-2">
              {dbStatus === 'connected' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c47] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c47]"></span>
                </>
              )}
              {dbStatus === 'connecting' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400 animate-pulse"></span>
              )}
              {dbStatus === 'error' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              )}
            </span>
            <span
              className={`hidden sm:inline text-xs font-semibold ${
                dbStatus === 'connected'
                  ? 'text-[#00734b]'
                  : dbStatus === 'connecting'
                  ? 'text-blue-600'
                  : 'text-red-600'
              }`}
            >
              {dbStatus === 'connected' && 'Supabase Connected'}
              {dbStatus === 'connecting' && 'Connecting...'}
              {dbStatus === 'error' && 'Connection Error'}
            </span>
          </div>

          {/* Redis status pill */}
          <div
            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3.5 py-1.5 rounded-full border ${
              redisStatus === 'connected'
                ? 'bg-red-50/50 border-red-200/50'
                : redisStatus === 'connecting'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-red-50 border-red-200'
            }`}
            id="redis-status-pill"
          >
            <span className="relative flex h-2 w-2">
              {redisStatus === 'connected' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </>
              )}
              {redisStatus === 'connecting' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400 animate-pulse"></span>
              )}
              {redisStatus === 'error' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
              )}
            </span>
            <span
              className={`hidden sm:inline text-xs font-semibold ${
                redisStatus === 'connected'
                  ? 'text-red-600'
                  : redisStatus === 'connecting'
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }`}
            >
              {redisStatus === 'connected' && `Redis GEO${redisGeoCount !== null ? ` (${redisGeoCount})` : ''}`}
              {redisStatus === 'connecting' && 'Redis...'}
              {redisStatus === 'error' && 'Redis Offline'}
            </span>
          </div>

          {/* User area */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full border border-gray-200 hover:border-[#003da6] hover:bg-blue-50/30 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-[#003da6] text-white flex items-center justify-center text-xs font-bold">
                  {userInitial}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden sm:block" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#c3c6d7] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Signed in as</p>
                      <p className="text-xs font-bold text-gray-900 truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); signOut(); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-[#003da6] hover:bg-[#0052d9] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col p-3 gap-1">
            {allTabs.map((item) => (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === item.key
                    ? 'bg-[#003da6]/10 text-[#003da6] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            {!user && AUTH_TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => { handleAuthTab(item.key); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
