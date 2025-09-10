import React from "react";

export default function DashboardTest() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        🐳 AI-Powered Docker Generator
      </h1>
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl mb-4">Test Dashboard</h2>
          <p className="text-slate-300">
            If you can see this, the routing is working!
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-4">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}
