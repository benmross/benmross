'use client';

import { motion } from 'framer-motion';

const Hero = () => {

  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Floating neumorphic shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            y: [0, -30, 0],
            rotate: [0, 12, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-20 h-20 shadow-neuro rounded-2xl bg-neuro-bg rotate-12 opacity-60"
        />
        <motion.div
          animate={{
            y: [0, 25, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/3 right-1/4 w-16 h-16 shadow-neuro rounded-full bg-neuro-bg opacity-60"
        />
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 15, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
          className="absolute bottom-1/3 left-[15%] w-24 h-24 shadow-neuro rounded-3xl bg-neuro-bg rotate-45 opacity-60"
        />
        <motion.div
          animate={{
            y: [0, 18, 0],
            rotate: [0, 8, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/4 right-[15%] w-14 h-14 shadow-neuro rounded-xl bg-neuro-bg opacity-60"
        />
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
          className="mb-10"
        >
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black text-white mb-6 leading-tight font-display">
            <motion.span
              className="block uppercase tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.4 }}
            >
              BEN ROSS
            </motion.span>
            <motion.span
              className="block text-2xl sm:text-4xl lg:text-5xl font-bold text-white/80 mt-3 uppercase tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.6 }}
            >
              DEVELOPER
            </motion.span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 15, delay: 0.8 }}
          className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed font-semibold"
        >
          Senior at Poolesville High School with a strong love for computer science, with a special focus on artificial intelligence and self-hosting. Explore my work below.
        </motion.p>

        {/* Call to action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 15, delay: 1 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => {
              const element = document.querySelector('#projects');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="neuro-button px-10 py-5 text-white font-bold text-lg min-w-[220px] uppercase tracking-tight group relative overflow-hidden"
          >
            <span className="relative z-10">VIEW MY WORK</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-2xl"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => {
              const element = document.querySelector('#contact');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="neuro-button px-10 py-5 text-white font-bold text-lg min-w-[220px] uppercase tracking-tight group relative overflow-hidden"
          >
            <span className="relative z-10">GET IN TOUCH</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-accent-500/20 to-primary-500/20 rounded-2xl"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;