
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("select-none", className)}
    >
      <h1 className="text-3xl font-bold tracking-tight">
        url<span className="text-primary">.io</span>
      </h1>
    </motion.div>
  );
};

export default Logo;
