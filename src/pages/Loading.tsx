
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const [logoCompleted, setLogoCompleted] = React.useState(false);
  const [industryCompleted, setIndustryCompleted] = React.useState(false);
  const [colorCompleted, setColorCompleted] = React.useState(false);

  useEffect(() => {
    // Simulate the extraction process with timeouts
    const logoTimer = setTimeout(() => {
      setLogoCompleted(true);
    }, 1500);
    
    const industryTimer = setTimeout(() => {
      setIndustryCompleted(true);
    }, 2500);
    
    const colorTimer = setTimeout(() => {
      setColorCompleted(true);
    }, 3500);
    
    const completionTimer = setTimeout(() => {
      navigate('/results');
    }, 4500);
    
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(industryTimer);
      clearTimeout(colorTimer);
      clearTimeout(completionTimer);
    };
  }, [navigate]);

  return (
    <div className="page-transition-container">
      <Logo className="mb-24" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="w-full max-w-xl flex flex-col items-center"
      >
        <h2 className="text-4xl font-light text-center mb-16">
          Getting your company details
        </h2>
        
        <div className="space-y-8 w-full max-w-xs">
          <div className="flex items-center justify-between">
            {logoCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center"
              >
                <CheckCircle className="success-icon" />
                <span>Company Logo</span>
              </motion.div>
            ) : (
              <div className="flex items-center">
                <motion.div 
                  className="h-6 w-6 rounded-full bg-white/20 mr-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span className="text-white/70">Company Logo</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {industryCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center"
              >
                <CheckCircle className="success-icon" />
                <span>Industry</span>
              </motion.div>
            ) : (
              <div className="flex items-center">
                <motion.div 
                  className="h-6 w-6 rounded-full bg-white/20 mr-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                />
                <span className="text-white/70">Industry</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {colorCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center"
              >
                <CheckCircle className="success-icon" />
                <span>Brand Color</span>
              </motion.div>
            ) : (
              <div className="flex items-center">
                <motion.div 
                  className="h-6 w-6 rounded-full bg-white/20 mr-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}
                />
                <span className="text-white/70">Brand Color</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingPage;
