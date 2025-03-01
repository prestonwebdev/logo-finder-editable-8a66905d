
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

    // Transform the response to match our CompanyData interface
    return {
      logo: data.logo || defaultData.logo,
      industry: data.industry || defaultData.industry,
      brandColor: data.brand_color || defaultData.brandColor
    };
  } catch (error) {
    console.error('Error extracting data from website:', error);
    return defaultData;
  }
};
