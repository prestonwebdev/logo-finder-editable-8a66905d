
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Upload, RefreshCw, Check, Images } from 'lucide-react';
import Logo from '@/components/Logo';
import { extractFromWebsite } from '@/utils/websiteParser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CompanyData {
  logo: string;
  brandColor: string;
  alternativeLogos?: string[];
}

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData>({
    logo: '/placeholder.svg',
    brandColor: '#000000',
    alternativeLogos: []
  });
  const [showLogoSelector, setShowLogoSelector] = useState(false);

  const fetchWebsiteData = async (websiteUrl: string) => {
    setIsLoading(true);
    try {
      console.log('Fetching website data for:', websiteUrl);
      const data = await extractFromWebsite(websiteUrl);
      console.log('Received website data:', data);
      
      setCompanyData({
        logo: data.logo,
        brandColor: data.brandColor,
        alternativeLogos: data.alternativeLogos || []
      });
      
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

  const handleSelectLogo = (logoUrl: string) => {
    setCompanyData({
      ...companyData,
      logo: logoUrl
    });
    setShowLogoSelector(false);
    toast.success('Logo updated');
  };

  const saveAndContinue = () => {
    toast.success('Company details saved successfully');
    setTimeout(() => {
      sessionStorage.removeItem('websiteUrl');
      navigate('/');
    }, 1500);
  };

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

  const hasAlternativeLogos = companyData.alternativeLogos && companyData.alternativeLogos.length > 0;

  return (
    <div className="page-transition-container">
      <Logo className="mb-24" companyLogo={companyData.logo} companyColor={companyData.brandColor} />
      
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
          <div className="flex justify-between items-center">
            <span className="text-lg">Company Logo</span>
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-48 h-24 flex items-center justify-center overflow-hidden glass-panel p-2 rounded-md"
                style={{ backgroundColor: companyData.brandColor ? `${companyData.brandColor}22` : 'transparent' }}
              >
                {companyData.logo && companyData.logo !== '/placeholder.svg' ? (
                  <img 
                    src={companyData.logo} 
                    alt="Company Logo" 
                    className="max-w-full max-h-full object-contain" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full"></div>
                )}
              </motion.div>
              <div className="flex space-x-2">
                {hasAlternativeLogos && (
                  <Popover open={showLogoSelector} onOpenChange={setShowLogoSelector}>
                    <PopoverTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-10 w-10 glass-panel rounded-full flex items-center justify-center"
                      >
                        <Images className="h-5 w-5" />
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-background/95 backdrop-blur-sm border-none">
                      <div className="p-4 border-b border-border">
                        <h4 className="font-medium text-sm">Select a logo</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          We found {companyData.alternativeLogos?.length + 1} logos for this website
                        </p>
                      </div>
                      <div className="p-4 max-h-[300px] overflow-y-auto">
                        <RadioGroup 
                          value={companyData.logo}
                          onValueChange={handleSelectLogo}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="col-span-2 flex items-center space-x-2 bg-muted/40 p-2 rounded-md">
                            <RadioGroupItem value={companyData.logo} id="main-logo" />
                            <div className="flex-1 overflow-hidden flex items-center justify-center h-20 bg-muted/20 rounded p-1">
                              <img 
                                src={companyData.logo} 
                                alt="Main Logo" 
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/placeholder.svg';
                                }} 
                              />
                            </div>
                            <div className="ml-2 text-xs text-muted-foreground">Primary</div>
                          </div>
                          
                          {companyData.alternativeLogos?.map((logoUrl, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <div className="flex items-center space-x-2 w-full bg-muted/40 p-2 rounded-md">
                                <RadioGroupItem value={logoUrl} id={`logo-${index}`} />
                                <div className="flex-1 overflow-hidden flex items-center justify-center h-16 w-full bg-muted/20 rounded p-1">
                                  <img 
                                    src={logoUrl} 
                                    alt={`Alternative Logo ${index + 1}`} 
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                    }} 
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
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
          </div>
          
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
            className="px-10 py-3 rounded-full font-medium"
            style={{ 
              backgroundColor: companyData.brandColor,
              color: '#fff'
            }}
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
