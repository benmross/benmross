'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  ArrowUpRightIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  BookOpenIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/outline';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  type: 'article';
  featured: boolean;
  url: string;
}

interface Lecture {
  id: number;
  title: string;
  venue: string;
  date: string;
  duration: string;
  description: string;
  type: 'lecture';
  featured: boolean;
  url: string;
}

type ContentItem = BlogPost | Lecture;

const Blog = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: 'Building a Real-Time Chat Application with WebSockets',
      excerpt: 'Learn how to implement real-time messaging using WebSockets, Socket.io, and React. We\'ll cover connection management, message queuing, and scaling considerations.',
      date: '2024-01-15',
      readTime: '8 min read',
      tags: ['React', 'WebSockets', 'Node.js'],
      type: 'article',
      featured: true,
      url: '#'
    },
    {
      id: 2,
      title: 'Modern CSS Techniques for Better Web Performance',
      excerpt: 'Explore advanced CSS techniques that can significantly improve your website\'s performance, including CSS containment, will-change, and modern layout methods.',
      date: '2024-01-10',
      readTime: '6 min read',
      tags: ['CSS', 'Performance', 'Web Development'],
      type: 'article',
      featured: false,
      url: '#'
    },
    {
      id: 3,
      title: 'Introduction to Machine Learning for Web Developers',
      excerpt: 'A beginner-friendly introduction to integrating machine learning models into web applications using TensorFlow.js and practical examples.',
      date: '2024-01-05',
      readTime: '12 min read',
      tags: ['Machine Learning', 'TensorFlow.js', 'AI'],
      type: 'article',
      featured: false,
      url: '#'
    }
  ];

  const lectures: Lecture[] = [
    {
      id: 1,
      title: 'The Future of Web Development: Trends and Technologies',
      venue: 'Tech Conference 2024',
      date: '2024-02-20',
      duration: '45 min',
      description: 'An overview of emerging technologies and trends shaping the future of web development, including AI integration, WebAssembly, and edge computing.',
      type: 'lecture',
      featured: true,
      url: '#'
    },
    {
      id: 2,
      title: 'Building Accessible Web Applications',
      venue: 'Student Developer Meetup',
      date: '2024-02-15',
      duration: '30 min',
      description: 'Best practices for creating web applications that are accessible to all users, covering WCAG guidelines, testing tools, and implementation strategies.',
      type: 'lecture',
      featured: false,
      url: '#'
    }
  ];

  const allContent: ContentItem[] = [...blogPosts, ...lectures].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const featuredContent = allContent.filter(item => item.featured);
  const otherContent = allContent.filter(item => !item.featured);

  return (
    <section id="blog" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Blog & Lectures
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto">
            Sharing knowledge through articles and presentations on web development, 
            technology trends, and programming best practices.
          </p>
        </motion.div>

        {/* Featured Content */}
        {featuredContent.length > 0 && (
          <div className="mb-16">
            <motion.h3
              initial={{ opacity: 0, x: -50 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-2xl font-bold text-white mb-8 flex items-center"
            >
              <span className="w-2 h-8 bg-primary-400 rounded-full mr-4"></span>
              Featured
            </motion.h3>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {featuredContent.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  className="group"
                >
                  <div className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/10 transition-all duration-500 h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                          {item.type === 'article' ? (
                            <BookOpenIcon className="w-5 h-5 text-white" />
                          ) : (
                            <PresentationChartBarIcon className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-white/60">
                          <span className="capitalize">{item.type}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <motion.a
                        href={item.url}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <ArrowUpRightIcon className="w-5 h-5" />
                      </motion.a>
                    </div>
                    
                    <h4 className="text-xl font-bold text-white mb-3 group-hover:text-primary-400 transition-colors">
                      {item.title}
                    </h4>
                    
                    <p className="text-white/80 mb-4 leading-relaxed">
                      {item.type === 'article' ? (item as BlogPost).excerpt : (item as Lecture).description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {item.type === 'article' ? (
                          (item as BlogPost).tags?.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm border border-white/20"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm border border-white/20">
                            {(item as Lecture).venue}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-white/60 text-sm">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {item.type === 'article' ? (item as BlogPost).readTime : (item as Lecture).duration}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Other Content */}
        <div>
          <motion.h3
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-2xl font-bold text-white mb-8 flex items-center"
          >
            <span className="w-2 h-8 bg-accent-400 rounded-full mr-4"></span>
            Recent Posts
          </motion.h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherContent.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                className="group"
              >
                <div className="glass backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/10 transition-all duration-300 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                        {item.type === 'article' ? (
                          <BookOpenIcon className="w-4 h-4 text-white" />
                        ) : (
                          <PresentationChartBarIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="text-white/60 text-sm capitalize">
                        {item.type}
                      </div>
                    </div>
                    <motion.a
                      href={item.url}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      <ArrowUpRightIcon className="w-4 h-4" />
                    </motion.a>
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-3 group-hover:text-primary-400 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  
                  <p className="text-white/80 mb-4 text-sm leading-relaxed line-clamp-3">
                    {item.type === 'article' ? (item as BlogPost).excerpt : (item as Lecture).description}
                  </p>
                  
                  <div className="flex items-center justify-between text-white/60 text-sm">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {item.type === 'article' ? (item as BlogPost).readTime : (item as Lecture).duration}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* View more button */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="btn-hover glass backdrop-blur-md px-8 py-4 rounded-full text-white font-semibold text-lg transition-all duration-300 hover:bg-white/20 border border-white/30"
          >
            View All Posts
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Blog;