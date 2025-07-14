'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  CodeBracketIcon, 
  AcademicCapIcon, 
  RocketLaunchIcon,
  HeartIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const About = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const skills = [
    { name: 'JavaScript', level: 90, color: 'from-yellow-400 to-orange-500' },
    { name: 'TypeScript', level: 85, color: 'from-blue-400 to-blue-600' },
    { name: 'React', level: 88, color: 'from-cyan-400 to-blue-500' },
    { name: 'Next.js', level: 82, color: 'from-gray-600 to-gray-800' },
    { name: 'Python', level: 75, color: 'from-green-400 to-blue-500' },
    { name: 'Node.js', level: 80, color: 'from-green-400 to-green-600' },
  ];

  const interests = [
    {
      icon: CodeBracketIcon,
      title: 'Web Development',
      description: 'Building responsive, modern web applications with cutting-edge technologies.'
    },
    {
      icon: RocketLaunchIcon,
      title: 'Innovation',
      description: 'Exploring new technologies and pushing the boundaries of what\'s possible.'
    },
    {
      icon: AcademicCapIcon,
      title: 'Learning',
      description: 'Constantly expanding my knowledge in technology and development.'
    },
    {
      icon: LightBulbIcon,
      title: 'Problem Solving',
      description: 'Tackling complex challenges with creative and efficient solutions.'
    },
  ];

  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>
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
            About Me
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto">
            A passionate 16-year-old developer combining technical skills 
            with creative vision to build meaningful digital experiences.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Story */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <HeartIcon className="w-8 h-8 text-pink-400 mr-3" />
                <h3 className="text-2xl font-bold text-white">My Story</h3>
              </div>
              <p className="text-white/90 leading-relaxed mb-4">
                At 16, I&apos;m already deeply passionate about technology and creative expression. 
                I started coding at 13, finding that programming allows me to create and share my vision with the world.
              </p>
              <p className="text-white/90 leading-relaxed mb-4">
                As a high school student, I balance my studies with personal projects, 
                always seeking to learn new technologies and improve my craft. I believe 
                that the intersection of technology and creativity is where innovation truly happens.
              </p>
              <p className="text-white/90 leading-relaxed mb-4">
                My goal is to use my skills to create meaningful digital experiences that 
                make a positive impact through innovative code and thoughtful design.
              </p>
              <p className="text-white/80 text-sm">
                For a detailed overview of my academic and project experience, view my{' '}
                <a href="/cv" className="text-primary-400 hover:text-primary-300 transition-colors font-semibold">
                  curriculum vitae
                </a>.
              </p>
            </div>

            {/* Interests */}
            <div className="grid grid-cols-2 gap-4">
              {interests.map((interest, index) => (
                <motion.div
                  key={interest.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="glass backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/10 transition-all duration-300 group"
                >
                  <interest.icon className="w-6 h-6 text-primary-400 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-white font-semibold text-sm mb-1">{interest.title}</h4>
                  <p className="text-white/70 text-xs">{interest.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right side - Skills */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="glass backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <LightBulbIcon className="w-8 h-8 text-yellow-400 mr-3" />
                <h3 className="text-2xl font-bold text-white">Skills & Technologies</h3>
              </div>
              
              <div className="space-y-6">
                {skills.map((skill, index) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{skill.name}</span>
                      <span className="text-white/70 text-sm">{skill.level}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${skill.level}%` } : {}}
                        transition={{ duration: 1, delay: 0.8 + index * 0.1, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="glass backdrop-blur-md rounded-xl p-6 border border-white/20 text-center"
              >
                <div className="text-3xl font-bold text-white mb-2">3+</div>
                <div className="text-white/70 text-sm">Years Coding</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="glass backdrop-blur-md rounded-xl p-6 border border-white/20 text-center"
              >
                <div className="text-3xl font-bold text-white mb-2">20+</div>
                <div className="text-white/70 text-sm">Projects Built</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;