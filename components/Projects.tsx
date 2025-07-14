'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';
import { 
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import Icon from './Icon';

const Projects = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const projects = [
    {
      id: 1,
      title: 'XR Symposium - Johns Hopkins University',
      description: 'Presented at the annual XR symposium on using ParaView and virtual reality to enhance students\' understanding of model exoplanets when designing, programming, and controlling rovers. Demonstrated innovative educational applications of XR technology.',
      category: 'Speaking',
      tech: ['ParaView', 'Virtual Reality', 'XR', 'Education'],
      image: '/images/BenSpeaking.jpg',
      date: '2025',
      featured: true,
      links: {
        demo: 'https://media.benmross.com/share/Z1P93X4zHV9oAdCtzlUh2RBxUpanbaTnwNpbOMnz1Le2t8OOXXAr68re5yKGNz4R9D8',
        code: undefined
      }
    },
    {
      id: 2,
      title: 'Pop for a Cause Website Designer',
      description: 'Using Typescript with TailWind CSS, constructing a professional and performant website for the Montgomery County based Pop for a Cause nonprofit organization. The site features an admin panel that interacts with a MongoDB backend, as well as donation functionality using Stripe. The site is in beta at pop.benmross.com.',
      category: 'Web Development',
      tech: ['TypeScript', 'TailwindCSS', 'MongoDB', 'Stripe', 'Next.js'],
      image: '/images/popWebsiteScreenshot.png',
      date: '2024',
      featured: true,
      links: {
        demo: 'https://pop.benmross.com',
        code: undefined
      }
    },
    {
      id: 3,
      title: 'Large Language Model Fine-Tuning',
      description: 'Using a dataset of every text I\'ve ever sent or received, developing a targeted method of fine-tuning Meta\'s open-source large language model, Llama 3.1, to respond to texts in a manner indistinguishable from myself. Leveraging Google\'s Cloud Compute services for each training iteration.',
      category: 'AI/ML',
      tech: ['Llama 3.1', 'Google Cloud', 'Python', 'Machine Learning'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: true,
      links: {
        demo: undefined,
        code: undefined
      }
    },
    {
      id: 4,
      title: 'Student Mental Health Mobile App',
      description: 'As core programmer on a small team of student developers, iteratively designing a mobile application to assist with student mental health throughout our school district. Working with representatives from our school system to form an official partnership.',
      category: 'Mobile Development',
      tech: ['React Native', 'Mobile Development', 'Healthcare'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: true,
      links: {
        demo: undefined,
        code: undefined
      }
    },
    {
      id: 5,
      title: 'Home Media Server',
      description: 'Using a collection of Docker containers, created and configured a home media server on a Raspberry Pi 3B+ with the capability to stream media throughout my home. Learned the benefits of containerization and hardware acceleration methods for low-spec devices.',
      category: 'DevOps',
      tech: ['Docker', 'Raspberry Pi', 'Linux', 'Media Streaming'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: false,
      links: {
        demo: undefined,
        code: undefined
      }
    },
    {
      id: 6,
      title: 'Autonomous Blimp Project',
      description: 'Designed (using CAD) and 3D printed gondola for an autonomous blimp. Developed software to facilitate autonomous movement utilizing a Raspberry Pi computer and motors. Utilized socket software structure for wireless communication and OpenCV for waypoint detection.',
      category: 'Robotics',
      tech: ['Raspberry Pi', 'OpenCV', 'CAD', '3D Printing', 'Python'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: false,
      links: {
        demo: undefined,
        code: undefined
      }
    },
    {
      id: 7,
      title: 'Robotic Rover for Exoplanet Simulation',
      description: 'As Lead Programmer, designed and built a robotic rover capable of traversing variable terrain on a simulated exoplanet, collecting and analyzing environmental data to detect dunes. Developed navigation, sample collection, and camera control systems.',
      category: 'Robotics',
      tech: ['Python', 'Computer Vision', 'Robotics', 'CAD'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: false,
      links: {
        demo: undefined,
        code: undefined
      }
    },
    {
      id: 8,
      title: 'Room Reservation Application',
      description: 'Solicited and documented requirements, designed, programmed, tested, and delivered a room reservation application for a school administrator. Developed backend and frontend using HTML, CSS, Tailwind, and MongoDB. Applied agile methodology with scrum-type meetings.',
      category: 'Web Development',
      tech: ['HTML', 'CSS', 'Tailwind', 'MongoDB', 'Full-Stack'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: false,
      links: {
        demo: undefined,
        code: undefined
      }
    },
    {
      id: 9,
      title: 'Network Security & Vulnerability Analysis',
      description: 'Conducted network and vulnerability scanning experiments in controlled mock network environments to prepare for Computer Networking class. Gained proficiency in Nmap for different subnets and Wireshark capture file analysis.',
      category: 'Cybersecurity',
      tech: ['Nmap', 'Wireshark', 'Network Security', 'Linux'],
      image: '/api/placeholder/600/400',
      date: '2024',
      featured: false,
      links: {
        demo: undefined,
        code: undefined
      }
    },
  ];

  const featuredProjects = projects.filter(project => project.featured);
  const otherProjects = projects.filter(project => !project.featured);

  return (
    <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>
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
            RECENT PROJECTS
          </h2>
        </motion.div>

        {/* Featured Projects */}
        <div className="mb-16">
          <motion.h3
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl font-black text-white mb-8 flex items-center font-display uppercase tracking-tight"
          >
            <span className="w-2 h-8 bg-primary-400 rounded-full mr-4"></span>
            FEATURED PROJECTS
          </motion.h3>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {featuredProjects.map((project, index) => {
              const hasImage = project.image && project.image !== '/api/placeholder/600/400';
              
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  className={`group ${hasImage ? 'lg:col-span-2' : 'lg:col-span-1'}`}
                >
                  <div className="glass backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 hover:bg-white/10 transition-all duration-500 h-full">
                    {hasImage && (
                      <div className="relative overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                          <Image 
                            src={project.image} 
                            alt={project.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                        
                        {/* Overlay buttons */}
                        <div className="absolute inset-0 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {project.links.demo && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="glass backdrop-blur-md p-3 rounded-full border border-white/30 hover:bg-white/20 transition-all duration-300"
                            >
                              <EyeIcon className="w-6 h-6 text-white" />
                            </motion.button>
                          )}
                          {project.links.code && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="glass backdrop-blur-md p-3 rounded-full border border-white/30 hover:bg-white/20 transition-all duration-300"
                            >
                              <CodeBracketIcon className="w-6 h-6 text-white" />
                            </motion.button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Project content */}
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-white mb-2">{project.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span className="flex items-center">
                            <TagIcon className="w-4 h-4 mr-1" />
                            {project.category}
                          </span>
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {project.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-white/80 mb-4 leading-relaxed">
                      {project.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tech.map((tech, techIndex) => (
                        <span
                          key={techIndex}
                          className="px-3 py-1 bg-white/10 rounded-full text-white/80 text-sm border border-white/20"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex space-x-4">
                      {project.links.demo && (
                        <motion.a
                          href={project.links.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="btn-hover flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>{project.category === 'Speaking' ? 'Watch Recording' : 'Live Demo'}</span>
                        </motion.a>
                      )}
                      {project.links.code && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="btn-hover flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white font-medium transition-colors border border-white/20"
                        >
                          <CodeBracketIcon className="w-4 h-4" />
                          <span>Code</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>

        {/* Other Projects */}
        <div>
          <motion.h3
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-2xl font-black text-white mb-8 flex items-center font-display uppercase tracking-tight"
          >
            <span className="w-2 h-8 bg-accent-400 rounded-full mr-4"></span>
            OTHER PROJECTS
          </motion.h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 50 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                className="group"
              >
                <div className="glass backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/10 transition-all duration-300 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                        <Icon 
                          name={project.category === 'Speaking' ? 'briefcase' : 'laptop'} 
                          size={20} 
                          className="brightness-0 invert"
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">{project.title}</h4>
                        <p className="text-white/60 text-sm">{project.category}</p>
                      </div>
                    </div>
                    <span className="text-white/50 text-sm">{project.date}</span>
                  </div>
                  
                  <p className="text-white/80 mb-4 text-sm leading-relaxed">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech.slice(0, 3).map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="px-2 py-1 bg-white/10 rounded text-white/70 text-xs border border-white/20"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.tech.length > 3 && (
                      <span className="px-2 py-1 bg-white/10 rounded text-white/70 text-xs border border-white/20">
                        +{project.tech.length - 3}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {project.links.demo && (
                      <motion.a
                        href={project.links.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-1 text-primary-400 hover:text-primary-300 transition-colors text-sm"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>{project.category === 'Speaking' ? 'Watch' : 'View'}</span>
                      </motion.a>
                    )}
                    {project.links.code && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-1 text-white/70 hover:text-white transition-colors text-sm"
                      >
                        <CodeBracketIcon className="w-4 h-4" />
                        <span>Code</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Projects;