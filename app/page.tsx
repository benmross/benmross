'use client';

import { useEffect } from 'react';
import Hero from '@/components/Hero';
import Projects from '@/components/Projects';
// import Blog from '@/components/Blog';
import Contact from '@/components/Contact';

export default function Home() {
  useEffect(() => {
    // Preload critical resources
    const preloadImages = () => {
      const imagesToPreload = [
        '/api/placeholder/600/400',
        // Add any other critical images here
      ];
      
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };

    preloadImages();

    // Add smooth scrolling behavior for anchor links
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    // Handle initial hash on page load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Cleanup
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse opacity-70"></div>
          <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse opacity-70" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse opacity-70" style={{ animationDelay: '4s' }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <Hero />
        <Projects />
        {/* <Blog /> */}
        <Contact />
        
        {/* Copyright Footer */}
        <div className="py-8 px-4 text-center border-t border-white/10">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Ben Ross. All rights reserved.
          </p>
        </div>
      </div>

      {/* Floating Action Button - Back to Top */}
      <button
        onClick={() => {
          const element = document.querySelector('#home');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-glow transition-all duration-300 hover:scale-110 opacity-0 animate-fade-in"
        style={{ animationDelay: '2s', animationFillMode: 'forwards' }}
        aria-label="Back to top"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 10l7-7m0 0l7 7m-7-7v18" 
          />
        </svg>
      </button>

      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div 
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-150 ease-out"
          style={{
            width: typeof window !== 'undefined' ? 
              `${(window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100}%` : 
              '0%'
          }}
        />
      </div>
    </div>
  );
}