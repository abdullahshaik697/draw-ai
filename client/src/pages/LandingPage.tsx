import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Share2, Zap, Users, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500 selection:text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Palette size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight">DrawAI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-gray-400 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <Link to="/login" className="hover:text-white transition-colors">Login</Link>
          <Link to="/signup" className="px-5 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-all font-semibold">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
              Draw. Collaborate.<br />Powered by AI.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The real-time collaborative whiteboarding tool that thinks with you. 
              Turn sketches into designs in seconds.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-xl shadow-purple-500/30">
                Start Drawing Free
              </Link>
              <button className="w-full md:w-auto px-10 py-4 bg-gray-900 border border-gray-800 rounded-full text-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <Box size={24} />
                View on GitHub
              </button>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px] -z-10" />
      </header>

      {/* Features Section */}
      <section id="features" className="py-32 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Users className="text-purple-400" />}
              title="Real-time Collaboration"
              description="Draw together with your team. See cursors move and shapes appear instantly."
            />
            <FeatureCard 
              icon={<Zap className="text-yellow-400" />}
              title="AI Shape Recognition"
              description="Your rough sketches automatically snap into perfect geometric shapes and UI components."
            />
            <FeatureCard 
              icon={<Share2 className="text-pink-400" />}
              title="Instant Export"
              description="Export your designs to SVG, PNG, or even clean React code with one click."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Palette size={20} />
            <span className="font-bold">DrawAI</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 DrawAI Inc. All rights reserved. Built with passion.
          </p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-colors"
  >
    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-inner">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

export default LandingPage;
