
import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  logo: string;
  industry: string;
  brandColor: string;
}

// Default values when website scraping fails
const defaultData: CompanyData = {
  logo: '/placeholder.svg',
  industry: 'Technology',
  brandColor: '#00D5AC'
};

// Helper function to validate image URLs
const isValidImageUrl = (url: string): boolean => {
  // Check if it's a data URL
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // Check common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext)) || url.includes('/favicon');
};

export const extractFromWebsite = async (url: string): Promise<CompanyData> => {
  try {
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

    // Validate the logo URL and use default if it's not valid
    let logo = data.logo || defaultData.logo;
    
    // Check if the logo URL is valid
    if (!isValidImageUrl(logo)) {
      console.warn('Invalid logo URL format, falling back to default:', logo);
      logo = defaultData.logo;
    }
    
    // Additional preflight check for the logo
    if (logo !== defaultData.logo && !logo.startsWith('data:')) {
      try {
        const response = await fetch(logo, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('Logo URL not accessible, falling back to default:', logo);
          logo = defaultData.logo;
        }
      } catch (e) {
        console.error('Error checking logo URL:', e);
        logo = defaultData.logo;
      }
    }

    // Transform the response to match our CompanyData interface
    return {
      logo,
      industry: data.industry || defaultData.industry,
      brandColor: data.brand_color || defaultData.brandColor
    };
  } catch (error) {
    console.error('Error extracting data from website:', error);
    return defaultData;
  }
};
