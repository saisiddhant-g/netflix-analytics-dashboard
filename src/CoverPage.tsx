import { motion } from 'motion/react';
import logoSrc from './assests/logo.png.png';

interface CoverPageProps {
  onEnter: () => void;
}

export default function CoverPage({ onEnter }: CoverPageProps) {
  return (
    <motion.div
      key="cover"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0C10] overflow-hidden"
    >
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(229,9,20,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Content stack */}
      <div className="relative flex flex-col items-center gap-8 px-6 text-center">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Glow ring behind logo */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: 'radial-gradient(circle, #E50914 0%, transparent 70%)' }}
          />
          <motion.img
            src={logoSrc}
            alt="Netflix logo"
            className="relative w-24 h-24 object-contain drop-shadow-2xl"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatType: 'loop' }}
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3"
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
            Netflix{' '}
            <span className="text-netflix-red">Content</span>
            <br />
            Intelligence
          </h1>

          <p className="text-[14px] text-white/40 max-w-xs leading-relaxed font-light">
            Explore trends, patterns, and insights in global content
          </p>
        </motion.div>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
          className="w-16 h-px bg-netflix-red/40"
        />

        {/* Enter button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onEnter}
          className="group relative flex items-center gap-2.5 px-8 py-3 rounded-full
                     bg-netflix-red text-white text-[13px] font-semibold tracking-wide
                     shadow-lg shadow-netflix-red/25
                     hover:bg-[#f0000f] hover:shadow-netflix-red/40
                     transition-colors duration-150 focus:outline-none focus-visible:ring-2
                     focus-visible:ring-netflix-red focus-visible:ring-offset-2
                     focus-visible:ring-offset-[#0B0C10]"
        >
          Enter Dashboard
          <motion.span
            className="inline-block"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            →
          </motion.span>
        </motion.button>

        {/* Version tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="text-[10px] text-white/15 uppercase tracking-[0.2em]"
        >
          Content Analytics Platform
        </motion.p>
      </div>
    </motion.div>
  );
}
