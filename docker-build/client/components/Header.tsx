import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Menu, X, User, LogOut, Bot } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AIAgent from "./AIAgent";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Check if we're on the dashboard page (Try Demo page)
  const isDashboardPage = location.pathname === '/dashboard';

  const handleNavClick = (section: string) => {
    if (section === 'contact') {
      // Scroll to footer
      const footer = document.getElementById('footer');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (section === 'features') {
      // Navigate to features page
      navigate('/features');
    } else if (section === 'workflow') {
      // Navigate to workflow page
      navigate('/workflow');
    } else {
      // Navigate to home page for other sections
      navigate('/');
    }
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/30 dark:border-neon-blue/20 transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <span className="text-xl sm:text-2xl font-bold gradient-text-neon font-mono tracking-tight">
              AutoDeploy.AI
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              to="/"
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </Link>
            <button
              onClick={() => handleNavClick('features')}
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </button>
            <button
              onClick={() => handleNavClick('workflow')}
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Workflow
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </button>
            <Link
              to="/intelligent-demo"
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              AI Demo
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/auto-deploy"
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Auto Deploy
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/docker-monitor"
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Docker Monitor
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/docker-status"
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Docker Status
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </Link>
            <button
              onClick={() => handleNavClick('contact')}
              className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium relative group text-sm lg:text-base"
            >
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-neon-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </button>
          </div>

          {/* Right Side Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* AI Assistant Button - Only show on dashboard page */}
            {isDashboardPage && (
              <Button
                onClick={() => setIsAIAssistantOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 transition-all duration-300 rounded-xl text-sm px-3 sm:px-4 shadow-lg hover:shadow-xl"
              >
                <Bot className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Button>
            )}
            <DarkModeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan border border-transparent hover:border-neon-blue/30 dark:hover:border-neon-cyan/30 transition-all duration-300 rounded-xl text-sm"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                  className="hidden sm:inline-flex text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan border border-transparent hover:border-neon-blue/30 dark:hover:border-neon-cyan/30 transition-all duration-300 rounded-xl text-sm"
                >
                  Login
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  className="bg-neon-blue text-white hover:bg-neon-blue/90 border border-neon-blue hover:border-neon-blue/80 transition-all duration-300 rounded-xl text-sm px-3 sm:px-4 shadow-lg hover:shadow-xl"
                >
                  Signup
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200/30 dark:border-neon-blue/20">
            <div className="flex flex-col space-y-3 pt-4">
              <Link
                to="/"
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <button
                onClick={() => handleNavClick('features')}
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-left"
              >
                Features
              </button>
              <button
                onClick={() => handleNavClick('workflow')}
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-left"
              >
                Workflow
              </button>
              <Link
                to="/auto-deploy"
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Auto Deploy
              </Link>
              <Link
                to="/docker-monitor"
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Docker Monitor
              </Link>
              <Link
                to="/docker-status"
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Docker Status
              </Link>
              <button
                onClick={() => handleNavClick('contact')}
                className="text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan transition-all duration-300 font-medium px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-left"
              >
                Contact
              </button>

              {/* AI Assistant Button for Mobile - Only show on dashboard page */}
              {isDashboardPage && (
                <button
                  onClick={() => {
                    setIsAIAssistantOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-3 py-2 rounded-lg transition-all duration-300"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI Assistant</span>
                </button>
              )}

              <div className="pt-2 border-t border-gray-200/30 dark:border-neon-blue/20">
                {user ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate('/dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan border border-transparent hover:border-neon-blue/30 dark:hover:border-neon-cyan/30 transition-all duration-300 rounded-xl mb-2"
                    >
                      <User className="w-4 h-4 mr-2 inline" />
                      Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan border border-transparent hover:border-neon-blue/30 dark:hover:border-neon-cyan/30 transition-all duration-300 rounded-xl"
                    >
                      <LogOut className="w-4 h-4 mr-2 inline" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/auth');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left text-gray-700 dark:text-gray-300 hover:text-neon-blue dark:hover:text-neon-cyan border border-transparent hover:border-neon-blue/30 dark:hover:border-neon-cyan/30 transition-all duration-300 rounded-xl"
                  >
                    Login / Signup
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Slide-in Popup from Right */}
      {isAIAssistantOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsAIAssistantOpen(false)}
          />

          {/* AI Assistant Panel sliding from right */}
          <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isAIAssistantOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
                  <p className="text-sm text-slate-400">Spark Intelligence</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                  Active
                </span>
                <button
                  onClick={() => setIsAIAssistantOpen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AI Assistant Content */}
            <div className="h-[calc(100%-5rem)] p-4">
              <AIAgent />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
