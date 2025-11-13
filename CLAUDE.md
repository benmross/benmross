# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for Ben Ross, built with Next.js 14, TypeScript, React, and Tailwind CSS. The site showcases projects, provides a CV/resume page, and includes contact information. It uses static site generation (SSG) with Next.js's `output: 'export'` configuration for deployment.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (outputs to ./dist directory)
npm run build

# Start production server (after build)
npm start

# Run linter
npm run lint
```

## Architecture

### Static Site Generation
- **Build Output**: The site uses `output: 'export'` in next.config.js, generating static HTML/CSS/JS files in the `dist/` directory
- **Trailing Slashes**: Configured with `trailingSlash: true` for proper static file routing
- **Images**: Uses `unoptimized: true` for Next.js Image component compatibility with static export

### Page Structure
- **App Router**: Uses Next.js 14 App Router architecture (`app/` directory)
- **Main Page** (`app/page.tsx`): Single-page application with sections for Hero, Projects, and Contact
- **CV Page** (`app/cv/page.tsx`): Separate route displaying curriculum vitae with education, experience, and skills
- **Layout** (`app/layout.tsx`): Root layout with comprehensive SEO metadata, Navigation component, and global styles

### Component Organization
All components are in the `components/` directory:
- `Navigation.tsx`: Sticky navigation with mobile menu, uses Framer Motion for animations
- `Hero.tsx`: Landing section with introduction
- `Projects.tsx`: Displays featured and other projects with filtering
- `Contact.tsx`: Contact form and information
- `Icon.tsx`: Custom icon wrapper component
- `About.tsx`, `Blog.tsx`, `Services.tsx`: Additional components (some may be unused)

### Styling System
- **Design Philosophy**: Neumorphism with soft colors and bouncy animations
  - Soft, pastel color palette (pinks, lavenders, blues, peaches)
  - Neumorphic shadows (dual light/dark shadows for depth)
  - Spring-based bouncy animations for playful interactions
  - Accessible with proper contrast ratios

- **Base Styles**: `app/globals.css` contains custom CSS including:
  - Neumorphic utilities (`.neuro-card`, `.neuro-button`, `.neuro-card-pressed`)
  - Gradient text effects (`.gradient-text`, `.gradient-text-soft`)
  - Custom animations (`.animated-gradient`, `.float-animation`, `.pulse-soft`, `.bouncy-hover`)
  - Accessibility features (reduced motion support)
  - Custom scrollbar with gradient colors

- **Tailwind Config** (`tailwind.config.js`): Extensive customization:
  - **Color Palettes**:
    - `primary`: Soft gray-blues (#f7f8fa to #2f3844)
    - `accent`: Soft purples/pinks (#fef5ff to #6d1b72)
    - `soft`: Pastel colors (pink, peach, lavender, mint, cream, sky)
    - `neuro`: Neumorphic background colors (#e6eaf0 base with light/dark variants)
  - **Animations**: Bouncy entrance animations (bounce-in, spring-up, elastic-in)
    - Continuous bouncy animations (bounce-gentle, float-bounce, wiggle, jello, rubber-band)
    - Spring-based easing functions for natural motion
  - **Shadows**: Neumorphic box shadows (neuro, neuro-sm, neuro-lg, neuro-inset)
  - **Font families**: Plus Jakarta Sans/Nunito (sans), Quicksand/Poppins (display)

### Animation and Interaction
- **Framer Motion**: Used throughout for page transitions, scroll animations, and micro-interactions
- **Intersection Observer**: `react-intersection-observer` for scroll-triggered animations
- **Smooth Scrolling**: Configured at HTML level with anchor link navigation

### Navigation Behavior
- Home page uses hash-based anchor links (`#home`, `#projects`, `#contact`)
- CV page is a separate route (`/cv`)
- Navigation component handles both internal anchors and route changes
- Mobile menu with animated slide-in/out

### Content Management
- **Projects**: Hardcoded in `Projects.tsx` component with featured/non-featured categorization
- **CV Data**: Hardcoded in `app/cv/page.tsx` with sections for education, experience, and skills
- **Static Assets**: Stored in `public/` with subdirectories for `documents/` and `images/`

## Key Implementation Details

### Static Export Considerations
- No API routes (incompatible with static export)
- No server-side runtime features
- Image optimization disabled (`unoptimized: true`)
- All dynamic content must be available at build time

### Animation Performance
- Uses `will-change` CSS property implicitly via Framer Motion
- Prefers-reduced-motion media query support in globals.css
- Staggered animation delays for list items

### Responsive Design
- Mobile-first approach using Tailwind breakpoints
- Mobile menu for navigation on smaller screens
- Responsive grid layouts for projects section
- Backdrop blur reduced on mobile for performance

### SEO & Metadata
- Comprehensive Open Graph tags in layout.tsx
- Twitter Card metadata
- Structured metadata with Next.js 14 Metadata API
- Canonical URLs and robots configuration

## Common Development Patterns

### Adding a New Project
Edit `components/Projects.tsx` and add to the `projects` array:
```typescript
{
  title: 'Project Name',
  description: 'Project description',
  category: 'Category',
  tech: ['Tech', 'Stack'],
  image: '/images/project.jpg',
  date: '2024',
  featured: true, // or false
  links: {
    demo: 'https://demo.url',
    code: 'https://github.com/...',
    slides: undefined // optional
  }
}
```

### Adding a New CV Entry
Edit `app/cv/page.tsx` and add to the `experiences` array with fields: `title`, `organization`, `date`, `type`, `description`, `technologies`.

### Creating New Sections
- Create component in `components/` directory
- Import and use in `app/page.tsx`
- Add navigation link to `Navigation.tsx` if needed
- Use similar animation patterns (Framer Motion + Intersection Observer)

## Deployment
Since this is a static export, the built files in `dist/` can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.). The build process generates all HTML files with proper routing structure.
