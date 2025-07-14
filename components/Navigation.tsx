'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Icon from './Icon';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Projects', href: '#projects' },
    { name: 'CV', href: '/cv' },
    { name: 'Contact', href: '#contact' },
  ];

  const socialLinks = [
    { 
      name: 'Email', 
      url: 'mailto:ben.m.ross08@gmail.com',
      icon: EnvelopeIcon,
      iconType: 'heroicon' as const
    },
    { 
      name: 'GitHub', 
      url: 'https://github.com/benmross', 
      icon: 'github' as const,
      iconType: 'custom' as const
    },
    { 
      name: 'Instagram', 
      url: 'https://instagram.com/_shotbyross', 
      icon: 'instagram' as const,
      iconType: 'custom' as const
    },
    { 
      name: 'LinkedIn', 
      url: 'https://www.linkedin.com/in/ben-m-ross/', 
      icon: 'linkedin' as const,
      iconType: 'custom' as const
    },
  ];

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith('/')) {
      // External route
      window.location.href = href;
    } else {
      // Internal anchor link
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass backdrop-blur-md border-b border-white/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-shrink-0"
          >
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('#home');
              }}
              className="text-2xl font-black text-white hover:text-primary-300 transition-colors font-display uppercase tracking-tight"
            >
              BR
            </a>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Nav Links */}
            <div className="flex items-baseline space-x-8">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="text-white hover:text-primary-300 px-3 py-2 rounded-md text-sm font-bold transition-all duration-300 hover:bg-white/10 relative group uppercase tracking-tight"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-400 transition-all duration-300 group-hover:w-full"></span>
                </motion.a>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-white/20">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target={social.name !== 'Email' ? '_blank' : undefined}
                  rel={social.name !== 'Email' ? 'noopener noreferrer' : undefined}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                  title={social.name}
                >
                  {social.iconType === 'heroicon' ? (
                    <social.icon className="w-5 h-5" />
                  ) : (
                    <Icon name={social.icon} size={20} className="brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-300" />
                  )}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 p-2 rounded-md transition-colors"
            >
              {isOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass backdrop-blur-md border-t border-white/20"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile Nav Links */}
              {navItems.map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className="text-white hover:text-primary-300 hover:bg-white/10 block px-3 py-2 rounded-md text-base font-bold transition-all duration-300 uppercase tracking-tight"
                >
                  {item.name}
                </motion.a>
              ))}

              {/* Mobile Social Links */}
              <div className="border-t border-white/20 pt-3 mt-4">
                <div className="flex items-center justify-center space-x-6">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.name}
                      href={social.url}
                      target={social.name !== 'Email' ? '_blank' : undefined}
                      rel={social.name !== 'Email' ? 'noopener noreferrer' : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                      title={social.name}
                    >
                      {social.iconType === 'heroicon' ? (
                        <social.icon className="w-6 h-6" />
                      ) : (
                        <Icon name={social.icon} size={24} className="brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-300" />
                      )}
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;