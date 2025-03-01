
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Logo from '@/components/Logo';

const UrlInput: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }
    
    let processedUrl = url;
    
    // Add https:// if it doesn't have a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      processedUrl = `https://${url}`;
    }
    
    try {
      new URL(processedUrl);
      setIsLoading(true);
      
      // Store the URL in sessionStorage for the other pages
      sessionStorage.setItem('websiteUrl', processedUrl);
      
      // Navigate to loading page
      setTimeout(() => {
        navigate('/loading');
      }, 500);
      
    } catch (error) {
      toast.error('Please enter a valid URL');
      setIsLoading(false);
    }
  };

  return (
    <div className="page-transition-container">
      <Logo className="mb-24" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="w-full max-w-xl"
      >
        <h2 className="text-4xl font-light text-center mb-12">
          Paste your URL to get started.
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <motion.div 
            className="w-full glass-panel rounded-full px-6 py-4 mb-8"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="url-input"
              placeholder="www.myurl.com"
              disabled={isLoading}
              autoFocus
            />
          </motion.div>
          
          <motion.button
            type="submit"
            className={`px-8 py-2.5 rounded-full glass-panel text-primary font-medium transition-all duration-300 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Analyze'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default UrlInput;
