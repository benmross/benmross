'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  CodeBracketIcon, 
  CameraIcon, 
  DevicePhoneMobileIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const Services = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const services = [
    {
      icon: GlobeAltIcon,
      title: 'Web Development',
      description: 'Modern, responsive websites built with the latest technologies like React, Next.js, and TypeScript.',
      features: ['Responsive Design', 'Performance Optimization', 'SEO Friendly', 'Modern UI/UX'],
      color: 'from-blue-400 to-cyan-500',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile-First Design',
      description: 'Creating seamless experiences across all devices with mobile-first approach and progressive enhancement.',
      features: ['Cross-Platform', 'Touch Optimized', 'Fast Loading', 'Offline Support'],
      color: 'from-green-400 to-emerald-500',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      icon: CameraIcon,
      title: 'Photography',
      description: 'Capturing compelling visuals for events, portraits, and commercial projects with creative storytelling.',
      features: ['Event Photography', 'Portrait Sessions', 'Commercial Work', 'Photo Editing'],
      color: 'from-purple-400 to-pink-500',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      icon: PaintBrushIcon,
      title: 'UI/UX Design',
      description: 'Designing intuitive and visually appealing interfaces that enhance user experience and engagement.',
      features: ['User Research', 'Wireframing', 'Prototyping', 'Visual Design'],
      color: 'from-orange-400 to-red-500',
      gradient: 'from-orange-500/20 to-red-500/20'
    },
    {
      icon: CodeBracketIcon,
      title: 'Custom Solutions',
      description: 'Building tailored applications and scripts to solve specific problems and automate processes.',
      features: ['API Integration', 'Database Design', 'Automation', 'Performance Tuning'],
      color: 'from-indigo-400 to-blue-500',
      gradient: 'from-indigo-500/20 to-blue-500/20'
    },
    {
      icon: BoltIcon,
      title: 'Performance & Speed',
      description: 'Optimizing websites and applications for maximum speed, efficiency, and user satisfaction.',
      features: ['Speed Optimization', 'Code Splitting', 'Caching Strategy', 'Bundle Analysis'],
      color: 'from-yellow-400 to-orange-500',
      gradient: 'from-yellow-500/20 to-orange-500/20'
    },
  ];

  return (
    <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Services
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto">
            Combining technical expertise with creative vision to deliver 
            exceptional digital experiences and visual storytelling.
          </p>
        </motion.div>

        {/* Services grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className="group"
            >
              <div className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/10 transition-all duration-500 h-full relative overflow-hidden">
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} p-4 group-hover:scale-110 transition-transform duration-300`}>
                      <service.icon className="w-full h-full text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-white transition-colors">
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/80 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.4 + index * 0.1 + featureIndex * 0.05 }}
                        className="flex items-center space-x-2"
                      >
                        <div className="w-2 h-2 bg-primary-400 rounded-full group-hover:scale-125 transition-transform"></div>
                        <span className="text-white/70 text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Hover effect border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/30 transition-all duration-500"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to bring your ideas to life?
            </h3>
            <p className="text-white/80 mb-6">
              Let&apos;s work together to create something amazing. Whether you need a website, 
              mobile app, or photography services, I&apos;m here to help.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const element = document.querySelector('#contact');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-hover bg-gradient-to-r from-primary-500 to-accent-500 px-8 py-4 rounded-full text-white font-semibold text-lg transition-all duration-300 hover:shadow-glow"
            >
              Start a Project
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;