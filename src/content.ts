// Every word on the site lives in this file. Edit here, not in the components.

export const site = {
  name: 'Ben Ross',
  lines: [
    'Computer science, University of Maryland, class of 2030.',
    'Research apprentice, Army Research Laboratory, summer 2026.',
  ],
  email: 'ben@benmross.com',
  links: [
    { label: 'GitHub', href: 'https://github.com/benmross' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ben-m-ross' },
    { label: 'CV', href: '/cv.pdf' },
    { label: 'Blog', href: 'https://blog.benmross.com' },
  ],
}

export type Link = { label: string; href: string }

export type Project = {
  id: string
  title: string
  /** How the big title breaks, when it should not be one line. */
  titleLines?: string[]
  years: string
  role: string
  stack: string
  blurb: string
  stats?: { value: string; label: string }[]
  links?: Link[]
  /** Accent for type, rules and highlights while the section is on screen. */
  accent: string
  /** Very dark tint the page background eases toward. */
  tint: string
}

export const projects: Project[] = [
  {
    id: 'herald',
    title: 'Herald',
    years: '2026 to now',
    role: 'Author',
    stack: 'Python, SQLite, Claude Code, Codex',
    blurb:
      'An open-source personal agent that runs on your own machine. It reads mail, calendar, messages, location and health into one ledger. Anything another person would see waits for a tap on your phone.',
    stats: [
      { value: '151k', label: 'facts in its ledger' },
      { value: '13', label: 'sources' },
      { value: 'MIT', label: 'license' },
    ],
    links: [{ label: 'Source', href: 'https://github.com/benmross/herald' }],
    accent: '#f2a83b',
    tint: '#15110a',
  },
  {
    id: 'kart',
    title: 'SMCS Kart',
    years: '2025 to 2026',
    role: 'Co-lead, with one classmate',
    stack: 'C++, PlatformIO, CAN, React, TypeScript',
    blurb:
      'A drive-by-wire electric go-kart, pitched to replace the robotics curriculum at Poolesville High School and taught from as it was built. One microcontroller owns motion. The dashboard can crash and the kart keeps driving.',
    stats: [
      { value: '1 Mbps', label: 'CAN bus' },
      { value: '3', label: 'processors' },
      { value: '0', label: 'motion from the dashboard' },
    ],
    links: [{ label: 'Source', href: 'https://github.com/PHS-SMCS/gokart-dash' }],
    accent: '#ff4a3d',
    tint: '#150808',
  },
  {
    id: 'bengpt',
    title: 'BenGPT',
    years: '2023 to 2024',
    role: 'Solo',
    stack: 'Llama 3.1, TensorFlow, CUDA, Google Cloud',
    blurb:
      'Llama 3.1 fine-tuned on five years of my own text messages. My best friend could not reliably tell it from me.',
    accent: '#3d8bff',
    tint: '#080c16',
  },
  {
    id: 'sparrows',
    title: 'Sparrows',
    years: '2023 to 2026',
    role: 'Lead developer',
    stack: 'Next.js, TypeScript, MongoDB, AWS Amplify, Gemini',
    blurb:
      'A dashboard for every school in the county: schedules, clubs and announcements, in English and Spanish. It ran on every classroom TV at Poolesville. Handed off in 2026.',
    stats: [
      { value: '30+', label: 'schools' },
      { value: '~30k', label: 'monthly users' },
      { value: 'MCPS', label: 'official partner' },
    ],
    accent: '#f28b5b',
    tint: '#140c08',
  },
  {
    id: 'gnss',
    title: 'GNSS spoofing',
    titleLines: ['GNSS', 'spoofing'],
    years: 'Summer 2026',
    role: 'Research apprentice, Army Research Laboratory',
    stack: 'Python, ADS-B, AIS, DBSCAN',
    blurb:
      'Finding where GPS is being spoofed, using the position reports ships and aircraft already broadcast. The graphic is an illustration, not the project.',
    accent: '#35e0c2',
    tint: '#06110f',
  },
  {
    id: 'falconia',
    title: 'Planet Falconia',
    titleLines: ['Planet', 'Falconia'],
    years: '2023 to 2026',
    role: 'Student researcher, with NIST',
    stack: 'VR, OpenCV, ParaView, LiDAR',
    blurb:
      'A rover mission on a simulated planet, turned into a digital twin you can walk through in VR. First high school students to speak at the Johns Hopkins APL XR Symposium.',
    stats: [
      { value: 'SIGGRAPH Asia', label: "2026 Educator's Forum, accepted" },
      { value: 'JHU APL', label: 'XR Symposium, 2025' },
    ],
    links: [{ label: 'Source', href: 'https://github.com/benmross/FalconiaAPL' }],
    accent: '#d9be98',
    tint: '#11100c',
  },
  {
    id: 'emulsion',
    title: 'emulsion',
    years: '2026',
    role: 'Solo',
    stack: 'WebGL2, GLSL',
    blurb: 'Film grain generated from math, in the browser. Drag to reseed.',
    links: [
      { label: 'Open it', href: 'https://emulsion.benmross.com' },
      { label: 'Source', href: 'https://github.com/benmross/emulsion' },
    ],
    accent: '#ffe0d2',
    tint: '#0d0c0a',
  },
]
