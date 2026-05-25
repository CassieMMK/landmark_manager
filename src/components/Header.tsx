import React from 'react';
import { AppTab } from '../types';
import { Database, Plus } from 'lucide-react';

interface HeaderProps {
  currentTab: AppTab;
  setTab: (tab: AppTab) => void;
}

export default function Header({ currentTab, setTab }: HeaderProps) {
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
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#78fbbb]/15 rounded-full border border-[#006c47]/10" id="redis-status-pill">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c47] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c47]"></span>
            </span>
            <span className="text-xs font-semibold text-[#00734b]">Redis Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
}
