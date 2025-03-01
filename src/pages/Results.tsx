
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Upload, Edit2, RefreshCw } from 'lucide-react';
import Logo from '@/components/Logo';
import { extractFromWebsite } from '@/utils/websiteParser';

interface CompanyData {
  logo: string;
  industry: string;
  brandColor: string;
}

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData>({
    logo: '/placeholder.svg',
    industry: 'Technology',
    brandColor: '#008F5D'
  });

  const fetchWebsiteData = async (websiteUrl: string) => {
    setIsLoading(true);
    try {
      // Extract website data
      const data = await extractFromWebsite(websiteUrl);
      setCompanyData(data);
      toast.success('Website data extracted successfully');
    } catch (error) {
      console.error('Error extracting data:', error);
      toast.error('Failed to extract website data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const websiteUrl = sessionStorage.getItem('websiteUrl');
    if (!websiteUrl) {
      navigate('/');
      return;
    }

    setUrl(websiteUrl);
    fetchWebsiteData(websiteUrl);
  }, [navigate]);

  const handleRefresh = () => {
    if (!url || isRefreshing) return;
    
    setIsRefreshing(true);
    fetchWebsiteData(url);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCompanyData({
            ...companyData,
            logo: event.target.result as string
          });
          toast.success('Logo updated successfully');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData({
      ...companyData,
      brandColor: e.target.value
    });
  };

  const handleIndustryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData({
      ...companyData,
      industry: e.target.value
    });
  };

  const saveAndContinue = () => {
    // Here you would save the data and proceed to the next step
    toast.success('Company details saved successfully');
    // For demo purposes, just return to the first page
    setTimeout(() => {
      sessionStorage.removeItem('websiteUrl');
      navigate('/');
    }, 1500);
  };

  // Loading state while extracting website data
  if (isLoading) {
    return (
      <div className="page-transition-container">
        <Logo className="mb-24" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="glass-panel rounded-2xl p-10 text-center">
            <h2 className="text-3xl font-light mb-6">Analyzing website...</h2>
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-12 h-12"
              >
                <RefreshCw className="w-12 h-12 text-primary" />
              </motion.div>
            </div>
            <p className="text-lg text-white/70">
              This might take a moment as we extract information from the website.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-transition-container">
      <Logo className="mb-24" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="glass-panel w-full max-w-2xl rounded-2xl p-10"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-light">
            Here's what we found
          </h2>
          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full glass-panel ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </motion.button>
        </div>
        
        <div className="space-y-12 max-w-md mx-auto">
          {/* Logo Section - Made Bigger, Removed Background */}
          <div className="flex justify-between items-center">
            <span className="text-lg">Company Logo</span>
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-48 h-24 flex items-center justify-center overflow-hidden glass-panel p-2 rounded-md"
              >
                {companyData.logo ? (
                  <img 
                    src={companyData.logo} 
                    alt="Company Logo" 
                    className="max-w-full max-h-full object-contain" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="text-center text-white/50">No logo found</div>
                )}
              </motion.div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-10 w-10 glass-panel rounded-full flex items-center justify-center"
                >
                  <Upload className="h-5 w-5" />
                </motion.div>
              </label>
            </div>
          </div>
          
          {/* Industry Section */}
          <div className="flex justify-between items-center">
            <span className="text-lg">Industry</span>
            <div className="flex items-center space-x-4">
              {editingIndustry ? (
                <motion.input
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  type="text"
                  value={companyData.industry}
                  onChange={handleIndustryChange}
                  onBlur={() => setEditingIndustry(false)}
                  autoFocus
                  className="glass-panel py-2 px-4 rounded-md url-input w-40 text-base text-right"
                />
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-panel py-2 px-4 rounded-md min-w-[160px] text-right"
                >
                  {companyData.industry}
                </motion.div>
              )}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditingIndustry(true)}
                className="h-10 w-10 glass-panel rounded-full flex items-center justify-center cursor-pointer"
              >
                <Edit2 className="h-5 w-5" />
              </motion.div>
            </div>
          </div>
          
          {/* Brand Color Section */}
          <div className="flex justify-between items-center">
            <span className="text-lg">Brand Color</span>
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center glass-panel py-2 px-4 rounded-md"
              >
                <div 
                  className="w-10 h-6 rounded mr-2" 
                  style={{ backgroundColor: companyData.brandColor }}
                />
                <span>{companyData.brandColor}</span>
              </motion.div>
              <label className="cursor-pointer">
                <input 
                  type="color"
                  value={companyData.brandColor}
                  onChange={handleColorChange}
                  className="h-0 w-0 opacity-0 absolute"
                />
                <motion.div
                  className="brand-color-picker"
                  style={{ backgroundColor: companyData.brandColor }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                />
              </label>
            </div>
          </div>
        </div>
        
        <motion.div 
          className="flex justify-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            onClick={saveAndContinue}
            className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Save and Continue
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResultsPage;
