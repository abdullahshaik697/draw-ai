import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Palette, Mail, Lock, User, ArrowRight } from 'lucide-react';
import axios from 'axios';

const SignupPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/signup', formData);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-10 rounded-[2.5rem] shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Palette size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Join DrawAI</h2>
          <p className="text-zinc-500 mt-2">Start your collaborative journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm text-center">{error}</div>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text" 
                placeholder="John Doe"
                className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="email" 
                placeholder="you@example.com"
                className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group"
          >
            Create Account
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="text-center text-zinc-500 mt-8">
          Already have an account? <Link to="/login" className="text-white font-bold hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignupPage;
