
import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  logo: string;
  brandColor: string;
}

// Default values when website scraping fails
const defaultData: CompanyData = {
  logo: '/placeholder.svg',
  brandColor: '#00D5AC'
};

// Helper function to validate image URLs with less strict validation
const isValidImageUrl = (url: string): boolean => {
  // If it's a data URL, it's valid
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // Accept any URL that looks like an image path
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp'];
  
  // Check if it has an image extension or contains keywords that suggest it's an image
  return imageExtensions.some(ext => url.toLowerCase().includes(ext)) || 
         url.toLowerCase().includes('logo') || 
         url.toLowerCase().includes('icon') || 
         url.toLowerCase().includes('image') ||
         url.toLowerCase().includes('favicon');
};

export const extractFromWebsite = async (url: string): Promise<CompanyData> => {
  try {
    console.log('Extracting data from website:', url);
    
    // Call the Supabase Edge Function to scrape the website
    const { data, error } = await supabase.functions.invoke('scrape-website', {
      body: { url },
    });

    if (error) {
      console.error('Error calling scrape-website function:', error);
      return defaultData;
    }

    if (!data) {
      console.error('No data returned from scrape-website function');
      return defaultData;
    }

    console.log('Received data from scrape-website function:', data);

    // Accept the logo URL with less validation to improve success rate
    let logo = data.logo || defaultData.logo;
    
    // Skip the explicit validation and trust the scraper's result more
    if (!logo || logo === 'undefined' || logo.includes('data:,')) {
      console.warn('Invalid logo URL, falling back to default:', logo);
      logo = defaultData.logo;
    }
    
    // Skip the preflight check as it's causing CORS issues
    // Just trust the URL returned by the scraper

    // Return with the brand color from the API response
    return {
      logo,
      brandColor: data.brand_color || defaultData.brandColor
    };
  } catch (error) {
    console.error('Error extracting data from website:', error);
    return defaultData;
  }
};
