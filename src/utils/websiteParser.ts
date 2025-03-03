
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

// Add a map of specific domains to their brand colors and logos
const knownBrandData: Record<string, Partial<CompanyData>> = {
  'bamboohr.com': {
    brandColor: '#7AC142',
    logo: 'https://www.bamboohr.com/images/logos/bamboohr-logo.svg'
  },
  'apple.com': {
    brandColor: '#000000',
    logo: 'https://www.apple.com/favicon.ico'
  }
};

// Try to fetch favicon as a fallback
const tryFetchFavicon = async (domain: string): Promise<string | null> => {
  try {
    // Common favicon locations
    const faviconUrls = [
      `https://${domain}/favicon.ico`,
      `https://${domain}/favicon.png`,
      `https://www.${domain}/favicon.ico`,
      `https://www.${domain}/favicon.png`,
      `https://${domain}/apple-touch-icon.png`,
      `https://www.${domain}/apple-touch-icon.png`
    ];
    
    // Try each potential favicon URL
    for (const url of faviconUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`Found favicon at: ${url}`);
          return url;
        }
      } catch (err) {
        // Continue to next URL if this one fails
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching favicon:', error);
    return null;
  }
};

export const extractFromWebsite = async (url: string): Promise<CompanyData> => {
  try {
    console.log('Extracting data from website:', url);
    
    // Extract domain for looking up known brand data
    let domain = '';
    try {
      domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
      console.log('Extracted domain:', domain);
      
      // Check if we have known data for this domain
      if (knownBrandData[domain]) {
        console.log('Found known brand data for domain:', domain);
        const knownData = knownBrandData[domain];
        
        // If we have complete known data, return it immediately
        if (knownData.logo && knownData.brandColor) {
          return {
            logo: knownData.logo,
            brandColor: knownData.brandColor
          };
        }
      }
    } catch (e) {
      console.error('Error extracting domain:', e);
    }
    
    // Call the Supabase Edge Function to scrape the website
    const { data, error } = await supabase.functions.invoke('scrape-website', {
      body: { url },
    });

    if (error) {
      console.error('Error calling scrape-website function:', error);
      
      // If we have partial known data, use it as fallback
      if (domain && knownBrandData[domain]) {
        return {
          logo: knownBrandData[domain].logo || defaultData.logo,
          brandColor: knownBrandData[domain].brandColor || defaultData.brandColor
        };
      }
      
      // Try to fetch favicon as a fallback
      if (domain) {
        const favicon = await tryFetchFavicon(domain);
        if (favicon) {
          return {
            logo: favicon,
            brandColor: knownBrandData[domain]?.brandColor || defaultData.brandColor
          };
        }
      }
      
      return defaultData;
    }

    if (!data) {
      console.error('No data returned from scrape-website function');
      
      // If we have partial known data, use it as fallback
      if (domain && knownBrandData[domain]) {
        return {
          logo: knownBrandData[domain].logo || defaultData.logo,
          brandColor: knownBrandData[domain].brandColor || defaultData.brandColor
        };
      }
      
      // Try to fetch favicon as a fallback
      if (domain) {
        const favicon = await tryFetchFavicon(domain);
        if (favicon) {
          return {
            logo: favicon,
            brandColor: knownBrandData[domain]?.brandColor || defaultData.brandColor
          };
        }
      }
      
      return defaultData;
    }

    console.log('Received data from scrape-website function:', data);

    // Accept the logo URL with less validation to improve success rate
    let logo = data.logo || defaultData.logo;
    
    // If logo is invalid but we have a known logo, use that instead
    if ((!logo || logo === 'undefined' || logo.includes('data:,')) && domain && knownBrandData[domain]?.logo) {
      logo = knownBrandData[domain].logo!;
      console.log('Using known logo for domain:', domain, logo);
    } else if (!logo || logo === 'undefined' || logo.includes('data:,')) {
      console.warn('Invalid logo URL, trying to fetch favicon...');
      
      // Try to fetch favicon as a fallback
      if (domain) {
        const favicon = await tryFetchFavicon(domain);
        if (favicon) {
          logo = favicon;
          console.log('Using favicon as fallback:', favicon);
        } else {
          logo = defaultData.logo;
        }
      } else {
        logo = defaultData.logo;
      }
    }
    
    // Get brand color from the API response or use known brand color if available
    let brandColor = data.brand_color;
    if (domain && knownBrandData[domain]?.brandColor) {
      brandColor = knownBrandData[domain].brandColor!;
      console.log('Using known brand color for domain:', domain, brandColor);
    }
    
    // Return with the brand color from the API response or known data
    return {
      logo,
      brandColor: brandColor || defaultData.brandColor
    };
  } catch (error) {
    console.error('Error extracting data from website:', error);
    return defaultData;
  }
};
