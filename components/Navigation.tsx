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
    { name: 'Home', href: '/#home' },
    { name: 'Projects', href: '/#projects' },
    { name: 'CV', href: '/cv' },
    { name: 'Contact', href: '/#contact' },
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
    if (href.startsWith('/') && href.includes('#')) {
      // Route with anchor (e.g., /#home, /#projects)
      window.location.href = href;
    } else if (href.startsWith('/')) {
      // External route without anchor
      window.location.href = href;
    } else {
      // Internal anchor link (fallback for any remaining # links)
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
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
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
            transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0.2 }}
            className="flex-shrink-0"
          >
            <a
              href="/#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('/#home');
              }}
              className="text-2xl font-black text-white hover:text-primary-300 transition-all duration-300 font-display uppercase tracking-tight bouncy-hover"
            >
              BR
            </a>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Nav Links */}
            <div className="flex items-baseline space-x-6">
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
                  transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.1 * index }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-white hover:text-primary-300 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-neuro-sm hover:shadow-neuro relative group uppercase tracking-tight"
                >
                  {item.name}
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
                  transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.15, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white shadow-neuro-sm hover:shadow-neuro transition-all duration-300 group"
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
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              whileTap={{ scale: 0.9 }}
              className="text-white hover:text-primary-300 focus:outline-none p-2 rounded-xl shadow-neuro-sm transition-all duration-300"
            >
              {isOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </motion.button>
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
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="md:hidden glass backdrop-blur-md border-t border-white/20"
          >
            <div className="px-4 pt-4 pb-4 space-y-3">
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
                  transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 * index }}
                  className="text-white hover:text-primary-300 shadow-neuro-sm hover:shadow-neuro block px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 uppercase tracking-tight"
                >
                  {item.name}
                </motion.a>
              ))}

              {/* Mobile Social Links */}
              <div className="border-t border-white/20 pt-4 mt-4">
                <div className="flex items-center justify-center space-x-4">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.name}
                      href={social.url}
                      target={social.name !== 'Email' ? '_blank' : undefined}
                      rel={social.name !== 'Email' ? 'noopener noreferrer' : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white shadow-neuro-sm hover:shadow-neuro transition-all duration-300 group"
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