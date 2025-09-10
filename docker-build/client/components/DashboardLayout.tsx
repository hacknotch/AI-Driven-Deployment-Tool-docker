import React from "react";
import DashboardHeader from "@/components/DashboardHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
  isAIAssistantOpen?: boolean;
}

export default function DashboardLayout({ children, isAIAssistantOpen = false }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-black">
      {/* Dashboard Header */}
      <div className="relative flex-shrink-0">
        <DashboardHeader />
        {/* Dashboard Title Bar */}
        <div
          className={`h-16 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl flex items-center px-4 sm:px-6 transition-all duration-300 ${
            isAIAssistantOpen ? 'lg:pr-[26rem]' : ''
          }`}
          style={{ marginTop: "80px" }}
        >
          <div className="flex items-center justify-between w-full">
            <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
              AI-Powered Dashboard
            </h1>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2 sm:px-3 py-1 bg-neon-blue/20 text-neon-cyan border border-neon-blue/30 rounded-full text-xs font-semibold">
                Live Mode
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-auto min-h-0 transition-all duration-300 ${
        isAIAssistantOpen ? 'lg:mr-96' : ''
      }`}>
        {children}
      </main>
    </div>
  );
}
