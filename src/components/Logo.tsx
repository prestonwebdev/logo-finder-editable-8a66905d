
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  companyLogo?: string;
  companyColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  companyLogo, 
  companyColor,
  size = 'md' 
}) => {
  // If companyLogo is provided, render a company logo
  if (companyLogo) {
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-12 h-12",
      lg: "w-16 h-16"
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("flex items-center justify-center overflow-hidden rounded-md", sizeClasses[size], className)}
        style={{ backgroundColor: companyColor ? companyColor : 'transparent' }}
      >
        <img 
          src={companyLogo} 
          alt="Company Logo" 
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
      </motion.div>
    );
  }

  // Default logo for the application
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("select-none", className)}
    >
      <h1 className="text-3xl font-bold tracking-tight">
        url<span style={{ color: companyColor || 'hsl(var(--primary))' }}>io</span>
      </h1>
    </motion.div>
  );
};

export default Logo;
