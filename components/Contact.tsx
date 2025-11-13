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
    <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-6 font-display uppercase tracking-tight">
            GET IN TOUCH
          </h2>
          <motion.div
            className="w-24 h-2 bg-gradient-to-r from-primary-400 to-accent-500 rounded-full mx-auto mb-6 shadow-neuro-sm"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.3 }}
          />
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto font-semibold">
            Ready to work together or discuss a project?
            Reach out through any of the channels below.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Contact Links Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Contact Links */}
            {contactLinks.map((contact, index) => (
              <motion.a
                key={contact.name}
                href={contact.url}
                target={contact.name !== 'Email' ? '_blank' : undefined}
                rel={contact.name !== 'Email' ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="neuro-card flex flex-col items-center space-y-5 p-8 rounded-3xl text-center group"
              >
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${contact.color} p-5 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center shadow-neuro-sm group-hover:shadow-neuro`}>
                  {contact.iconType === 'heroicon' ? (
                    <contact.icon className="w-full h-full text-white" />
                  ) : (
                    <Icon name={contact.icon} size={36} className="brightness-0 invert" />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-black text-lg uppercase tracking-tight mb-2">{contact.name}</h4>
                  <p className="text-white/70 font-semibold text-sm">{contact.preview}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;