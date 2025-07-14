'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import Icon from './Icon';

const Contact = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });


  const contactLinks = [
    {
      name: 'Email',
      url: 'mailto:ben.m.ross08@gmail.com',
      icon: EnvelopeIcon,
      iconType: 'heroicon' as const,
      color: 'from-blue-400 to-cyan-500',
      preview: 'ben.m.ross08@gmail.com'
    },
    { 
      name: 'GitHub', 
      url: 'https://github.com/benmross', 
      icon: 'github' as const,
      iconType: 'custom' as const,
      color: 'from-gray-400 to-gray-600',
      preview: 'benmross'
    },
    { 
      name: 'Instagram', 
      url: 'https://instagram.com/_shotbyross', 
      icon: 'instagram' as const,
      iconType: 'custom' as const,
      color: 'from-pink-400 to-purple-600',
      preview: '_shotbyross'
    },
    { 
      name: 'LinkedIn', 
      url: 'https://www.linkedin.com/in/ben-m-ross/', 
      icon: 'linkedin' as const,
      iconType: 'custom' as const,
      color: 'from-blue-500 to-blue-700',
      preview: 'ben-m-ross'
    },
  ];

  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 font-display uppercase tracking-tight">
            GET IN TOUCH
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto font-semibold">
            Ready to work together or discuss a project? 
            Reach out through any of the channels below.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Consolidated Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Contact Links */}
              {contactLinks.map((contact, index) => (
                <motion.a
                  key={contact.name}
                  href={contact.url}
                  target={contact.name !== 'Email' ? '_blank' : undefined}
                  rel={contact.name !== 'Email' ? 'noopener noreferrer' : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center space-y-4 p-6 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20 text-center group"
                >
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${contact.color} p-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center`}>
                    {contact.iconType === 'heroicon' ? (
                      <contact.icon className="w-full h-full text-white" />
                    ) : (
                      <Icon name={contact.icon} size={32} className="brightness-0 invert" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg uppercase tracking-tight">{contact.name}</h4>
                    <p className="text-white/70 font-medium text-sm">{contact.preview}</p>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;