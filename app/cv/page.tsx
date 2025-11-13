'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  AcademicCapIcon, 
  BriefcaseIcon, 
  WrenchScrewdriverIcon,
  CalendarIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const CVPage = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const experiences = [
    {
      title: 'XR Symposium Presentation',
      organization: 'Johns Hopkins University',
      date: '2025',
      type: 'Speaking Engagement',
      description: 'Presented at the annual XR symposium on using ParaView and virtual reality to enhance students\' understanding of model exoplanets when designing, programming, and controlling rovers. Demonstrated innovative educational applications of XR technology.',
      technologies: ['ParaView', 'Virtual Reality', 'XR', 'Education']
    },
    {
      title: 'Large Language Model Fine-Tuning',
      organization: 'Personal Research Project',
      date: '2024',
      type: 'Research & Development',
      description: 'Using a dataset of every text I\'ve ever sent or received, developing a targeted method of fine-tuning Meta\'s open-source large language model, Llama 3.1, using Python to respond to texts in a manner indistinguishable from myself. Leveraging Google\'s Cloud Compute services with Tensorflow and Nvidia CUDA parallelization for each training iteration.',
      technologies: ['Python', 'Llama 3.1', 'Google Cloud', 'Tensorflow', 'CUDA']
    },
    {
      title: 'Home Media Server',
      organization: 'Personal Infrastructure Project',
      date: '2024',
      type: 'DevOps & Infrastructure',
      description: 'Using a collection of Docker containers, created and configured a home media server on a Raspberry Pi 3B+ with the capability to stream media throughout my home. The challenges from running this on low powered hardware taught me about containerization benefits and hardware acceleration methods for low-spec devices.',
      technologies: ['Docker', 'Raspberry Pi', 'Linux', 'Media Streaming']
    },
    {
      title: 'Autonomous Blimp Project',
      organization: 'Poolesville High School',
      date: '2024',
      type: 'Robotics & Engineering',
      description: 'Designed (using CAD) and 3D printed gondola for an autonomous blimp that was both lightweight and capable of holding sensors and motors. Developed software to facilitate autonomous movement utilizing a Raspberry Pi computer and motors. Utilized socket software structure for wireless communication and developed OpenCV image processing pipelines for locating waypoints.',
      technologies: ['CAD', '3D Printing', 'Raspberry Pi', 'OpenCV', 'Python']
    },
    {
      title: 'Personal LLM Assistant',
      organization: 'Personal Automation Project',
      date: '2024',
      type: 'Software Development',
      description: 'Using self-hosted Docker instances of n8n and Ollama, constructed an automation workflow allowing a tool-assisted LLM agent to access and manipulate my Spotify and Notion accounts when given written instructions.',
      technologies: ['Docker', 'n8n', 'Ollama', 'API Integration']
    },
    {
      title: 'Student Mental Health Mobile App',
      organization: 'School District Partnership',
      date: '2025',
      type: 'Mobile Development',
      description: 'As core programmer on a small team of student developers, iteratively designing a mobile app using React Native to assist with student mental health in high schools throughout the country. A digital pilot with our first school system is planned for August.',
      technologies: ['React Native', 'Mobile Development', 'Healthcare']
    },
    {
      title: 'Gene Data Representation',
      organization: 'Poolesville High School',
      date: '2024',
      type: 'Data Science & Biology',
      description: 'Utilized the R programming language to create scalable vector graphic representations of data from a genome-wide association study. Constructed a lesson plan in close collaboration with my teacher to better integrate R into the biology curriculum.',
      technologies: ['R', 'Data Visualization', 'SVG', 'Biology']
    },
    {
      title: 'Robotic Rover for Exoplanet Simulation',
      organization: 'Poolesville High School',
      date: '2024',
      type: 'Robotics & Programming',
      description: 'As Lead Programmer, designed and built a robotic rover capable of traversing variable terrain on a simulated exoplanet, collecting and analyzing environmental data to detect dunes. Developed code for navigation, sample collection scooper, and camera systems. Applied engineering principles, creative problem-solving, and iterative design.',
      technologies: ['Python', 'Robotics', 'CAD', '3D Printing', 'Computer Vision']
    },
    {
      title: 'Room Reservation Application',
      organization: 'Poolesville High School',
      date: '2024',
      type: 'Full-Stack Development',
      description: 'Solicited and documented requirements, designed, programmed in HTML, CSS, and Tailwind, tested, and delivered a room reservation application for a school administrator. As Lead Programmer, developed backend and frontend, utilizing a MongoDB remote database. Applied object-oriented and iterative software development processes including scrum-type meetings.',
      technologies: ['HTML', 'CSS', 'Tailwind', 'MongoDB', 'Full-Stack']
    }
  ];

  const skills = {
    proficient: ['Python', 'Java', 'React Native', 'Linux file systems', 'Presentation development and delivery'],
    learning: ['Docker Containers', 'Kubernetes', 'Network Scanning', 'LLM Fine-Tuning', 'MongoDB']
  };

  const education = {
    degree: 'Senior - Poolesville High School',
    school: 'Poolesville High School',
    program: 'Science, Math, Computer Science Magnet Program',
    courses: ['Analysis of Algorithms', 'AP Computer Science', 'AP Statistics', 'Foundations of Technology']
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="text-center mb-20"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-6 font-display uppercase tracking-tight">
            CURRICULUM VITAE
          </h1>
          <motion.div
            className="w-24 h-2 bg-gradient-to-r from-primary-400 to-accent-500 rounded-full mx-auto mb-8 shadow-neuro-sm"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.3 }}
          />
          <div className="text-xl text-white/80 mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">Ben Ross</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-white/60 font-medium">
              <span className="flex items-center gap-2">
                <EnvelopeIcon className="w-5 h-5" />
                ben.m.ross08@gmail.com
              </span>
              <span className="flex items-center gap-2">
                <MapPinIcon className="w-5 h-5" />
                Poolesville, MD
              </span>
            </div>
          </div>

          {/* Download Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 90, damping: 15, delay: 0.4 }}
            className="text-center mt-10"
          >
            <motion.a
              href="/documents/Ben_Ross_Resume.docx"
              download="Ben_Ross_Resume.docx"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="neuro-button inline-flex items-center gap-3 px-8 py-4 text-white font-bold text-lg rounded-2xl"
            >
              <ArrowDownTrayIcon className="w-6 h-6" />
              Download Resume
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Education */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
          className="mb-16"
        >
          <div className="flex items-center mb-10">
            <AcademicCapIcon className="w-10 h-10 text-primary-400 mr-4" />
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display uppercase tracking-tight">Education</h2>
          </div>

          <div className="neuro-card p-10 rounded-3xl">
            <div className="mb-6">
              <h3 className="text-2xl font-black text-white mb-3">{education.degree}</h3>
              <p className="text-white/80 text-lg font-semibold mb-4">{education.program}</p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-4">Relevant Courses:</h4>
              <div className="flex flex-wrap gap-3">
                {education.courses.map((course, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 shadow-neuro-sm rounded-xl text-white font-semibold text-sm"
                  >
                    {course}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Experience */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.4 }}
          className="mb-16"
        >
          <div className="flex items-center mb-10">
            <BriefcaseIcon className="w-10 h-10 text-primary-400 mr-4" />
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display uppercase tracking-tight">Experience</h2>
          </div>

          <div className="space-y-6">
            {experiences.map((exp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.1 * index }}
                whileHover={{ x: 5 }}
                className="neuro-card p-8 rounded-3xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">{exp.title}</h3>
                    <p className="text-accent-400 text-sm font-bold uppercase tracking-tight">{exp.type}</p>
                  </div>
                  <div className="flex items-center text-white/60 text-sm font-semibold mt-2 sm:mt-0">
                    <CalendarIcon className="w-5 h-5 mr-1" />
                    {exp.date}
                  </div>
                </div>

                <p className="text-white/80 leading-relaxed">{exp.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Skills */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center mb-10">
            <WrenchScrewdriverIcon className="w-10 h-10 text-primary-400 mr-4" />
            <h2 className="text-3xl sm:text-4xl font-black text-white font-display uppercase tracking-tight">Skills</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="neuro-card p-8 rounded-3xl">
              <h3 className="text-2xl font-black text-white mb-6">Proficient In:</h3>
              <div className="space-y-3">
                {skills.proficient.map((skill, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-3 h-3 bg-gradient-to-br from-primary-400 to-accent-500 rounded-full mr-4 shadow-neuro-sm"></div>
                    <span className="text-white/80 font-medium">{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="neuro-card p-8 rounded-3xl">
              <h3 className="text-2xl font-black text-white mb-6">Currently Learning:</h3>
              <div className="space-y-3">
                {skills.learning.map((skill, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-3 h-3 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full mr-4 shadow-neuro-sm"></div>
                    <span className="text-white/80 font-medium">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.8 }}
          className="text-center"
        >
          <div className="neuro-card p-8 rounded-3xl">
            <p className="text-white/60 text-sm leading-relaxed">
              This CV represents my academic and project experience as a senior at Poolesville High School.
              For the most current version, please visit{' '}
              <a href="/" className="text-primary-400 hover:text-primary-300 transition-colors font-bold">
                benmross.com
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CVPage;