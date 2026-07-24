import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Curriculum Vitae',
  description: 'Ben Ross — education, technical experience, and skills.',
}

const experience = [
  ['2025', 'XR Symposium Presentation', 'Johns Hopkins University', 'Presented an educational workflow combining ParaView, virtual reality, model exoplanets, and student-built rovers.'],
  ['2024', 'Large Language Model Fine-Tuning', 'Independent research', 'Developed a targeted Llama 3.1 fine-tuning method using Python, TensorFlow, CUDA, and Google Cloud compute.'],
  ['2024', 'Autonomous Blimp', 'Robotics & engineering', 'Designed and 3D-printed a lightweight gondola; built Raspberry Pi motor control, socket communication, and OpenCV waypoint detection.'],
  ['2025', 'Student Mental Health App', 'Product development', 'Core programmer on a student team iteratively building a React Native resource for high schools.'],
  ['2024', 'Personal LLM Assistant', 'AI automation', 'Built a self-hosted n8n and Ollama agent capable of working with Spotify and Notion through natural-language instructions.'],
  ['2024', 'Exoplanet Rover', 'Lead programmer', 'Developed navigation, sample collection, and camera systems for a rover traversing variable simulated terrain.'],
  ['2024', 'Home Media Server', 'Infrastructure', 'Designed a Docker-based streaming stack for a resource-constrained Raspberry Pi 3B+, including hardware acceleration.'],
  ['2024', 'Gene Data Representation', 'Data science & biology', 'Created scalable R visualizations for genome-wide association study data and helped integrate the work into a biology lesson.'],
  ['2024', 'Room Reservation System', 'Full-stack development', 'Gathered requirements and delivered a MongoDB-backed application for a school administrator using an iterative development process.'],
]

export default function CVPage() {
  return (
    <main className="cv">
      <header className="cv-nav">
        <a href="/" className="wordmark">BR<span>®</span></a>
        <a href="/">← BACK TO PORTFOLIO</a>
      </header>
      <section className="cv-hero">
        <span>CURRICULUM VITAE / 2026</span>
        <h1>BEN<br /><i>ROSS</i></h1>
        <div>
          <p>Incoming University of Maryland computer science freshman working across intelligent software, physical systems, and practical tools.</p>
          <p>Poolesville, Maryland<br /><a href="mailto:ben.m.ross08@gmail.com">ben.m.ross08@gmail.com</a></p>
        </div>
      </section>
      <section className="cv-section education">
        <span>01 / EDUCATION</span>
        <div>
          <h2>University of Maryland</h2>
          <h3>B.S. Computer Science · Incoming Freshman</h3>
          <p>Beginning undergraduate study in computer science. Previously attended the Science, Math & Computer Science Magnet Program at Poolesville High School, with coursework including Analysis of Algorithms, AP Computer Science, and AP Statistics.</p>
        </div>
      </section>
      <section className="cv-section">
        <span>02 / SELECTED EXPERIENCE</span>
        <div className="cv-list">
          {experience.map(([year, title, type, description]) => (
            <article key={title}>
              <time>{year}</time>
              <div><h2>{title}</h2><h3>{type}</h3><p>{description}</p></div>
            </article>
          ))}
        </div>
      </section>
      <section className="cv-section skills">
        <span>03 / CAPABILITIES</span>
        <div>
          <h2>Python · TypeScript · Java · R · React · React Native · Next.js · Linux · Docker · Raspberry Pi · TensorFlow · OpenCV · MongoDB · CAD · 3D printing</h2>
          <a className="download" href="/documents/Ben_Ross_Resume.docx" download>DOWNLOAD RESUME ↘</a>
        </div>
      </section>
      <footer className="cv-footer"><span>BEN ROSS</span><a href="mailto:ben.m.ross08@gmail.com">LET’S TALK ↗</a></footer>
    </main>
  )
}
