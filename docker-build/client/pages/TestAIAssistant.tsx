import React from 'react';
import AIAssistant from '@/components/AIAssistant';

export default function TestAIAssistant() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Assistant Test Page</h1>
        <p className="text-slate-400 mb-8">
          This page tests the enhanced AI Assistant component with real-time console-style messages and responsive design.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Enhanced Features</h2>
            <ul className="space-y-2 text-slate-300">
              <li>✅ Responsive design (mobile-friendly)</li>
              <li>✅ Real-time console-style messages</li>
              <li>✅ GitHub repository analysis</li>
              <li>✅ File upload analysis</li>
              <li>✅ Developer-friendly output</li>
              <li>✅ Step-by-step thinking process</li>
              <li>✅ Technical question answering</li>
            </ul>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
            <ol className="space-y-2 text-slate-300">
              <li>1. Look for the purple floating button (bottom-right)</li>
              <li>2. Click it to open the AI Assistant</li>
              <li>3. Try pasting a GitHub URL (e.g., github.com/username/repo)</li>
              <li>4. Watch the real-time console analysis</li>
              <li>5. Ask technical questions (e.g., "What is Docker Compose?")</li>
              <li>6. Test responsive design on mobile</li>
              <li>7. Click the X to close the chat</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Example GitHub URLs to Test</h2>
          <div className="space-y-2 text-slate-300">
            <p>Try these URLs in the AI Assistant:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code className="bg-slate-700 px-2 py-1 rounded">https://github.com/hacknotch/deep_fake-detection.git</code></li>
              <li><code className="bg-slate-700 px-2 py-1 rounded">https://github.com/yeongpin/cursor-free-vip</code></li>
              <li><code className="bg-slate-700 px-2 py-1 rounded">https://github.com/facebook/react</code></li>
            </ul>
          </div>
        </div>
      </div>
      
      <AIAssistant isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />
    </div>
  );
}
