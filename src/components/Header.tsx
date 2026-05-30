import React from 'react';
import { AppTab } from '../types';
import { Database, Plus } from 'lucide-react';
import { DbStatus } from '../App';

interface HeaderProps {
  currentTab: AppTab;
  setTab: (tab: AppTab) => void;
  dbStatus: DbStatus;
}

export default function Header({ currentTab, setTab, dbStatus }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm" id="header-nav">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setTab('home')} 
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#003da6] transition-transform active:scale-98"
          >
            <span className="relative flex h-5 w-5 items-center justify-center bg-[#003da6] text-white text-xs font-black rounded-sm shadow-sm">
              L
            </span>
            <span className="font-extrabold select-none">Landmark Manager</span>
          </button>
          
          <nav className="flex items-center gap-6" id="navbar-links">
            <button
              onClick={() => setTab('home')}
              className={`pb-1 text-sm font-medium tracking-wide transition-all border-b-2 ${
                currentTab === 'home'
                  ? 'text-[#003da6] border-[#003da6] font-semibold'
                  : 'text-gray-500 border-transparent hover:text-[#003da6]'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setTab('list')}
              className={`pb-1 text-sm font-medium tracking-wide transition-all border-b-2 ${
                currentTab === 'list'
                  ? 'text-[#003da6] border-[#003da6] font-semibold'
                  : 'text-gray-500 border-transparent hover:text-[#003da6]'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setTab('add')}
              className={`pb-1 text-sm font-medium tracking-wide transition-all border-b-2 ${
                currentTab === 'add'
                  ? 'text-[#003da6] border-[#003da6] font-semibold'
                  : 'text-gray-500 border-transparent hover:text-[#003da6]'
              }`}
            >
              Add
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${
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
              className={`text-xs font-semibold ${
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
        </div>
      </div>
    </header>
  );
}
