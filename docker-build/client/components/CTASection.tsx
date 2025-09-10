import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CTASection() {
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate('/dashboard');
  };

  return (
    <section className="py-24 bg-gradient-to-br from-brand-600 via-purple-700 to-pink-600 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Floating 3D Elements */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-white/20 rounded-xl transform rotate-12 animate-float shadow-2xl"></div>
      <div
        className="absolute top-32 right-20 w-12 h-12 bg-white/15 rounded-full animate-float shadow-2xl"
        style={{ animationDelay: "1.5s" }}
      ></div>
      <div
        className="absolute bottom-20 left-20 w-20 h-20 bg-white/10 rounded-2xl transform -rotate-12 animate-float shadow-2xl"
        style={{ animationDelay: "0.5s" }}
      ></div>
      <div
        className="absolute bottom-32 right-10 w-14 h-14 bg-white/25 rounded-lg transform rotate-45 animate-float shadow-2xl"
        style={{ animationDelay: "2.5s" }}
      ></div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Heading */}
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
            Deploy Smarter
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              with AI Today!
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of developers and DevOps teams who have already
            transformed their deployment workflows. Experience the future of
            automated deployments with zero configuration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button
              size="lg"
              onClick={handleStartTrial}
              className="text-xl px-12 py-8 bg-white text-brand-700 hover:bg-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 font-bold"
            >
              Start Free Trial
              <span className="ml-3 text-2xl">🚀</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-xl px-12 py-8 border-2 border-white text-white hover:bg-white hover:text-brand-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 font-bold"
            >
              Request a Demo
              <span className="ml-3 text-2xl">📺</span>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-2">
                Free Forever
              </div>
              <div className="text-white/80">No credit card required</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-2">
                5-Min Setup
              </div>
              <div className="text-white/80">Deploy in minutes, not hours</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-2">
                24/7 Support
              </div>
              <div className="text-white/80">Expert help when you need it</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
