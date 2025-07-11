# Ben Ross Portfolio

A modern, animated portfolio website for Ben Ross - a 16-year-old developer and photographer. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Modern Design**: Glassmorphism effects, gradient backgrounds, and smooth animations
- **Fully Responsive**: Mobile-first design that works on all devices
- **Performance Optimized**: Built with Next.js 14 for fast loading times
- **Accessibility**: WCAG compliant with proper contrast ratios and keyboard navigation
- **SEO Optimized**: Meta tags, structured data, and semantic HTML
- **Interactive Elements**: Smooth scrolling, hover effects, and micro-interactions

## Technologies Used

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom configurations
- **Animations**: Framer Motion
- **Icons**: Heroicons
- **Deployment**: Static export ready

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Start production server**:
   ```bash
   npm start
   ```

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles and animations
│   ├── layout.tsx           # Root layout component
│   └── page.tsx            # Main homepage
├── components/
│   ├── About.tsx           # About section
│   ├── Contact.tsx         # Contact section
│   ├── Hero.tsx            # Hero section
│   ├── Navigation.tsx      # Navigation component
│   ├── Projects.tsx        # Projects section
│   └── Services.tsx        # Services section
├── package.json
├── tailwind.config.js      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── next.config.js          # Next.js configuration
```

## Sections

1. **Hero**: Animated landing section with call-to-action buttons
2. **About**: Personal story, skills, and interests
3. **Services**: Web development and photography services
4. **Projects**: Featured and recent projects showcase
5. **Contact**: Contact form and social links

## Customization

### Colors
The color scheme can be customized in `tailwind.config.js`:
- Primary colors: Blue gradient
- Accent colors: Cyan gradient
- Custom gradients for various elements

### Animations
Custom animations are defined in both `tailwind.config.js` and `globals.css`:
- Fade in/out animations
- Slide animations
- Scale animations
- Gradient animations
- Floating animations

### Content
Update the content in each component file to match your personal information:
- Personal details in `Hero.tsx`
- Skills and experience in `About.tsx`
- Services offered in `Services.tsx`
- Projects in `Projects.tsx`
- Contact information in `Contact.tsx`

## Performance Features

- **Static Generation**: Pre-rendered at build time
- **Code Splitting**: Automatic code splitting for optimal loading
- **Image Optimization**: Next.js Image component for optimized images
- **Font Optimization**: Google Fonts optimization
- **Bundle Analysis**: Webpack bundle analyzer ready

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the [MIT License](LICENSE).

## Contact

Ben Ross - [ben@example.com](mailto:ben@example.com)

Project Link: [https://github.com/benross/portfolio](https://github.com/benross/portfolio)