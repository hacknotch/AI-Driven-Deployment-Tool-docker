import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-black dark:via-gray-900 dark:to-black">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-brand-400/20 to-brand-600/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        {/* 3D Floating Elements */}
        <div className="absolute -top-20 left-10 w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl transform rotate-12 animate-float shadow-2xl"></div>
        <div
          className="absolute -top-10 right-20 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-float shadow-2xl"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute top-32 -left-10 w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg transform -rotate-12 animate-float shadow-2xl"
          style={{ animationDelay: "0.5s" }}
        ></div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-brand-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Automate Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 bg-clip-text text-transparent">
              Deployments
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-brand-600 bg-clip-text text-transparent">
              with AI
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-white mb-8 max-w-3xl mx-auto leading-relaxed">
            <strong>Faster, Smarter, Error-Free</strong>
            <br />
            Streamline CI/CD pipelines and let AI handle deployments across
            Docker, Kubernetes, and Cloud.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="text-lg px-8 py-6 bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started
              <span className="ml-2">🚀</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/workflow")}
              className="text-lg px-8 py-6 border-2 border-brand-500 text-brand-700 hover:bg-brand-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              View Workflow
              <span className="ml-2">⚡</span>
            </Button>
          </div>

          {/* 3D Workflow Visualization */}
          <div className="relative">
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-gray-200/50 dark:border-gray-800/50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {/* Code Commit */}
                <div className="flex flex-col items-center space-y-2 group">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-3">
                    <span className="text-2xl">💻</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-white">
                    Code Commit
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-8 h-1 bg-gradient-to-r from-brand-400 to-brand-600 rounded-full animate-pulse"></div>
                </div>

                {/* AI Analyzer */}
                <div className="flex flex-col items-center space-y-2 group">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-3">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-white">
                    AI Analyzer
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-8 h-1 bg-gradient-to-r from-brand-400 to-brand-600 rounded-full animate-pulse"></div>
                </div>

                {/* Deployment */}
                <div className="flex flex-col items-center space-y-2 group">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-3">
                    <span className="text-2xl">☁️</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-white">
                    Deploy to Cloud
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
