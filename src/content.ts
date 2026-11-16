// Every word on the site lives in this file. Edit here, not in the components.

export const site = {
  name: 'Ben Ross',
  /** The one address Google and link previews should use. Vercel sends www here. */
  url: 'https://benmross.com/',
  /** What search results and link previews show. Keep the description under about 155 characters. */
  title: 'Ben Ross · Computer Science, University of Maryland',
  description:
    'Ben Ross, computer science at the University of Maryland. UMD Loop, Herald, SMCS Kart, BenGPT, Sparrows, GNSS spoofing at ARL, Planet Falconia and emulsion.',
  lines: [
    'Computer science, University of Maryland, class of 2029.',
    'Research apprentice, Army Research Laboratory, summer 2026.',
  ],
  email: 'ben@benmross.com',
  links: [
    { label: 'GitHub', href: 'https://github.com/benmross' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ben-m-ross' },
    { label: 'CV', href: '/cv.pdf' },
  ],
}

export type Link = { label: string; href: string; primary?: boolean }

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
    id: 'loop',
    title: 'UMD Loop',
    titleLines: ['UMD', 'Loop'],
    years: '2026 to now',
    role: 'Software subteam, University Rover Challenge',
    stack: 'Python, ARKit, ROS 2, three.js, PySide6, GStreamer',
    blurb:
      'Maryland\'s Mars rover team. I am building a controller that drives the rover\'s arm with a held iPhone instead of a gamepad, and I rebuilt the base station console the operators drive from.',
    stats: [
      { value: '4', label: 'ways to track the operator' },
      { value: '0.5 rad/s', label: 'per joint, as on the real arm' },
      { value: '5', label: 'seats per mission in the console' },
    ],
    links: [{ label: 'Arm controller source', href: 'https://github.com/benmross/armtrack' }],
    accent: '#a493ff',
    tint: '#0c0b14',
  },
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
      'A drive-by-wire electric go-kart, pitched to replace the robotics curriculum at Poolesville High School and taught from as it was built.',
    stats: [
      { value: '40 mph', label: 'top speed' },
      { value: '40 hp', label: 'peak motor power' },
      { value: '72 V', label: 'drivetrain' },
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
      'Finding where GPS is being spoofed, using the position reports ships and aircraft already broadcast.',
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
    stack: 'SwiftUI, Metal, GLSL',
    blurb: 'An iPhone app for making grainy, abstract wallpapers. Start with a plate, adjust the form, color and grain, and save it at the resolution of your screen. Every pixel is generated on your device.',
    links: [
      { label: 'Install for iPhone', href: 'https://apps.apple.com/app/id6809967506', primary: true },
      { label: 'Open web version', href: 'https://emulsion.benmross.com' },
      { label: 'Source', href: 'https://github.com/benmross/emulsion' },
    ],
    accent: '#ffe0d2',
    tint: '#0d0c0a',
  },
]

export const emulsionPreview = {
  device: 'Emulsion running on an iPhone',
  caption: 'Inside the app',
  screens: [
    { name: 'Plates', src: '/media/emulsion/plates.webp', alt: 'Emulsion on iPhone: Satin wallpaper and the starting plate picker' },
    { name: 'Color', src: '/media/emulsion/color.webp', alt: 'Emulsion on iPhone: wallpaper preview and color controls' },
    { name: 'Grain', src: '/media/emulsion/grain.webp', alt: 'Emulsion on iPhone: wallpaper preview and grain controls' },
  ],
}

/** Words in the Loop section's scroll scene. */
export const loopScene = {
  operator: 'Operator',
  arm: 'Arm',
  following: 'Thumb down, following',
  holding: 'Thumb up, holding',
  outOfReach: 'Out of reach',
  atLimit: 'At a joint limit',
  scripted: 'Scripted session, through the real controller code',
  recorded: 'Recorded Arm Pilot session',
  joints: ['Base yaw', 'Shoulder', 'Elbow', 'Wrist pitch', 'Wrist roll'],
  capped: 'at 0.5 rad/s',
  /** What the drive act says, by track time in seconds. */
  notes: [
    { from: 0, text: 'An iPhone running Arm Pilot. ARKit tracks where it is and which way it points.' },
    { from: 1.7, text: 'Thumb down: the arm follows the phone, scaled 2.5 times.' },
    { from: 7.7, text: 'Thumb up: the arm holds still while the hand resets.' },
    { from: 9.5, text: 'Every joint is capped at 0.5 rad/s, so a fast hand leads and the arm catches up.' },
    { from: 13.2, text: 'Tilt and roll the phone and the wrist pitches and rolls with it.' },
    { from: 17.6, text: 'Past its reach the arm stops at the nearest pose it can make, and the phone buzzes.' },
  ],
  trackersTitle: 'Same arm, four ways to track the operator',
  /** In the order the scene shows them; status as in the armtrack README. */
  trackers: [
    { name: 'Phone', how: 'ARKit pose of a held iPhone', status: 'Recommended' },
    { name: 'Stereo hand', how: 'Two cameras, 21 landmarks, triangulated', status: 'Works; depth noisy on fast motion' },
    { name: 'Mono hand', how: 'One camera, depth from apparent hand size', status: 'Works; depth as good as the size estimate' },
    { name: 'Marker wand', how: 'Printed ArUco cube, gyro in the grip', status: 'Verified in simulation; hardware being built' },
  ],
  wallTitle: 'The base station console',
  wallNote: 'Five seats per mission, a readiness check, and one bitrate budget shared by every camera. Delivery mission shown; the driver and drone screens show the rover\'s own view.',
  /** Delivery mission, left to right, as in the team console. */
  seats: ['Rover Technician', 'Arm Operator', 'Navigator', 'Drone', 'Driver'],
  readiness: ['Link', 'GNSS', 'Telemetry', 'Drive', 'Arm', 'Power', 'Cameras', 'CAN'],
  cameras: ['Mast 360', 'Front (ZED)', 'Wheel FL', 'Wheel FR', 'Arm base', 'Arm wrist', 'Gripper', 'Rear', 'Drone'],
  /** Labels on the schematic console screens, as in the team console. */
  console: {
    screen: 'Screen',
    mission: 'Delivery',
    link: 'Link',
    battery: 'Battery',
    stop: 'Stop',
    readiness: 'Readiness',
    bandwidth: 'Camera bandwidth',
    armJoints: 'Arm joints',
    droneFeed: 'Drone',
    driveFeeds: ['Front (ZED)', 'Wheel FL', 'Wheel FR'],
    tabs: [
      ['Rover', 'Network', 'CAN and ROS'],
      ['Cameras', 'Kinematics'],
      ['Map', 'Mission', 'Terrain'],
      ['Flight', 'Survey'],
      ['Drive', 'Map'],
    ],
  },
  fallbackAlt: 'Arm Pilot driving the simulated Loop arm: the rover model with its arm reaching out, and Ben holding the phone in the corner',
  fallbackCaption: 'Arm Pilot driving the simulated arm',
}
