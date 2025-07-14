'use client';

import { motion } from 'framer-motion';

const Hero = () => {

  return (
    <section id="home" className="h-[85vh] flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Animated gradient elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full blur-3xl animate-float"></div>
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            y: [0, -25, 0],
            rotate: [0, 8, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-lg rotate-12"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -8, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/3 right-1/3 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full"
        />
        <motion.div
          animate={{
            y: [0, -15, 0],
            rotate: [0, 12, 0],
            scale: [1, 1.03, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
          className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-white/10 backdrop-blur-sm rounded-xl rotate-45"
        />
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-white mb-4 leading-tight font-display">
            <span className="block uppercase tracking-tight">BEN ROSS</span>
            <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white/80 mt-1 uppercase tracking-tight">
              DEVELOPER & ENGINEER
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed font-semibold"
        >
          High school student passionate about building innovative web applications 
          and creating compelling digital experiences. Explore my latest projects below.
        </motion.p>

        {/* Call to action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.9, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.08, y: -4 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => {
              const element = document.querySelector('#projects');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-hover glass backdrop-blur-md px-8 py-4 rounded-full text-white font-bold text-lg transition-all duration-300 hover:bg-white/20 border border-white/30 min-w-[200px] smooth-hover uppercase tracking-tight"
          >
            VIEW MY WORK
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.08, y: -4 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => {
              const element = document.querySelector('#contact');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-hover bg-white/20 backdrop-blur-md px-8 py-4 rounded-full text-white font-bold text-lg transition-all duration-300 hover:bg-white/30 border border-white/30 min-w-[200px] smooth-hover uppercase tracking-tight"
          >
            GET IN TOUCH
          </motion.button>
        </motion.div>

      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none"></div>
    </section>
  );
};

export default Hero;