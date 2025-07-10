# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Technology Stack
- **Framework**: Astro 4.x with TypeScript
- **Styling**: Tailwind CSS with custom base styles disabled
- **Content**: MDX and Markdown with frontmatter
- **React**: Used for interactive components (search, cards, datetime)
- **Build**: Astro bundler with Jampack optimization

## Development Commands
```bash
# Start development server
npm run dev

# Build for production (includes Jampack optimization)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format

# Check formatting without changes
npm run format:check

# Generate new content
npm run write
```

## Architecture

### Content Structure
- **Posts**: Located in `src/content/posts/` as MDX/Markdown files with frontmatter
- **Drafts**: Located in `src/content/drafts/` (not published)
- **Content Schema**: Defined in `src/content/config.ts` with Zod validation
- **Required frontmatter**: `date`, `title`, optional `tags`, `description`, `ogImage`, `featured`, `draft`

### Key Directories
- `src/components/`: Astro and React components (Header, Footer, Search, Card, etc.)
- `src/layouts/`: Page layouts (Layout, PostDetails, Posts, etc.)
- `src/pages/`: Route definitions and page components
- `src/utils/`: Utility functions for posts, tags, pagination, OG image generation
- `src/styles/`: Base CSS styles
- `public/`: Static assets

### Configuration
- **Site config**: `src/config.ts` contains SITE object with metadata, social links
- **Astro config**: `astro.config.mjs` defines integrations and markdown processing
- **Content processing**: Uses remark-toc, remark-collapse, and rehype-slug

### Key Features
- Static site generation with dynamic routing
- Search functionality (Fuse.js)
- Tag-based post organization
- RSS feed generation
- OG image generation using Satori
- Dark/light theme toggle
- Responsive design with Tailwind

### Content Management
- Posts support embedded images in subdirectories
- Automatic slug generation from filenames
- Tag-based categorization and filtering
- Post pagination (25 posts per page)
- Related posts functionality

### Build Process
- Astro build generates static site
- Jampack optimizes the output in `./dist`
- Husky runs pre-commit hooks with lint-staged
- Prettier formats on commit