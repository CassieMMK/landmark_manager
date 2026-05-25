import React from 'react';

interface FooterProps {
  showLatency?: boolean;
}

export default function Footer({ showLatency = true }: FooterProps) {
  // Let's keep a stable, clean, mock system latency that adds technical depth
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto" id="app-footer">
      <div className="flex flex-col sm:flex-row justify-between items-center w-full px-6 py-4.5 max-w-7xl mx-auto gap-3 text-xs text-gray-500 font-medium">
        <div className="flex items-center gap-2">
          <span>© 2026 Landmark Manager</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400 font-mono text-[11px]">System: Spring Boot + React + Redis GEO</span>
        </div>
        
        <div className="flex gap-6 items-center">
          <a href="#" className="hover:text-gray-900 underline transition-colors">Documentation</a>
          <a href="#" className="hover:text-gray-900 underline transition-colors">API Status</a>
          <a href="#" className="hover:text-gray-900 underline transition-colors">Support</a>
          {showLatency && (
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <span className="text-gray-400">System Latency:</span>
              <span className="font-mono font-bold text-[#006c47]">14ms</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
