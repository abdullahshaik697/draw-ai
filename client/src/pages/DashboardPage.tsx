import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, MoreVertical, Palette } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const createNewProject = async () => {
    // For now just redirect to a new drawing page
    const id = Math.random().toString(36).substring(7);
    navigate(`/draw/${id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Palette size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Your Projects</h1>
              <p className="text-zinc-500">Manage and create your designs</p>
            </div>
          </div>
          
          <button 
            onClick={createNewProject}
            className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
          >
            <Plus size={20} />
            New Project
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Create New Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={createNewProject}
            className="aspect-[4/3] bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
          >
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-zinc-500 group-hover:text-purple-400" />
            </div>
            <span className="font-bold text-zinc-500 group-hover:text-purple-400">Blank Canvas</span>
          </motion.div>

          {projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mt-20">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center mt-20 py-20 bg-zinc-900/20 rounded-[3rem] border border-zinc-800/50">
            <p className="text-zinc-500 text-lg">No projects yet. Start by creating one!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectCard = ({ project }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group cursor-pointer hover:border-zinc-700 transition-all"
  >
    <div className="h-2/3 bg-zinc-800/50 flex items-center justify-center relative">
       {/* Preview Placeholder */}
       <Palette size={40} className="text-zinc-700 opacity-20" />
       <div className="absolute top-4 right-4">
         <button className="p-2 hover:bg-black/20 rounded-full transition-colors">
           <MoreVertical size={16} className="text-zinc-500" />
         </button>
       </div>
    </div>
    <div className="p-5 flex flex-col justify-between h-1/3">
      <h3 className="font-bold text-lg truncate">{project.title || 'Untitled'}</h3>
      <div className="flex justify-between items-center text-sm text-zinc-500">
        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-zinc-900" />
        </div>
      </div>
    </div>
  </motion.div>
);

export default DashboardPage;
