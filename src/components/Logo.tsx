
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
  if (companyLogo && companyLogo !== '/placeholder.svg') {
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
            // Instead of showing a placeholder image, hide the image and show text
            e.currentTarget.style.display = 'none';
            // Adding a text node as a sibling element doesn't work well
            // So we'll change the parent div content
            const parentDiv = e.currentTarget.parentElement;
            if (parentDiv) {
              parentDiv.innerHTML = '<span class="text-xs font-medium text-center">No Logo Found</span>';
            }
          }}
        />
      </motion.div>
    );
  }
  
  // Show "No Logo Found" text when companyLogo is the placeholder
  if (companyLogo === '/placeholder.svg') {
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
        style={{ backgroundColor: companyColor ? `${companyColor}22` : 'transparent' }}
      >
        <span className="text-xs font-medium text-center">No Logo Found</span>
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
