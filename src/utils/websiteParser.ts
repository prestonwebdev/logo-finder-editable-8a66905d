import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  logo: string;
  brandColor: string;
}

// Default values when website scraping fails
const defaultData: CompanyData = {
  logo: '/placeholder.svg',
  brandColor: '#000000'  // Default is black
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
  'apple.com': {
    brandColor: '#000000',
    logo: 'https://www.apple.com/favicon.ico'
  },
  // Adding more known brands
  'google.com': {
    brandColor: '#4285F4',
    logo: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
  },
  'microsoft.com': {
    brandColor: '#00A4EF',
    logo: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31'
  },
  'amazon.com': {
    brandColor: '#FF9900',
    logo: 'https://logo.clearbit.com/amazon.com'
  },
  'facebook.com': {
    brandColor: '#1877F2',
    logo: 'https://logo.clearbit.com/facebook.com'
  },
  'twitter.com': {
    brandColor: '#1DA1F2',
    logo: 'https://logo.clearbit.com/twitter.com'
  },
  'netflix.com': {
    brandColor: '#E50914',
    logo: 'https://logo.clearbit.com/netflix.com'
  },
  'spotify.com': {
    brandColor: '#1DB954',
    logo: 'https://logo.clearbit.com/spotify.com'
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

// Try to fetch logo from third-party logo APIs
const tryFetchFromLogoApis = async (domain: string): Promise<string | null> => {
  try {
    // Try Clearbit Logo API (doesn't require API key)
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    try {
      const response = await fetch(clearbitUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`Found logo via Clearbit: ${clearbitUrl}`);
        return clearbitUrl;
      }
    } catch (err) {
      console.log('Clearbit API failed, trying other sources...');
    }
    
    // Try Favicon Kit API (doesn't require API key)
    const faviconKitUrl = `https://api.faviconkit.com/${domain}/144`;
    try {
      const response = await fetch(faviconKitUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`Found logo via FaviconKit: ${faviconKitUrl}`);
        return faviconKitUrl;
      }
    } catch (err) {
      console.log('FaviconKit API failed, trying other sources...');
    }
    
    // Try Google's favicon service (doesn't require API key)
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    try {
      console.log(`Trying Google favicon: ${googleFaviconUrl}`);
      return googleFaviconUrl; // Google service almost always returns something
    } catch (err) {
      console.log('Google favicon service failed');
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching logo from APIs:', error);
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
      
      // First try third-party logo APIs
      if (domain) {
        const apiLogo = await tryFetchFromLogoApis(domain);
        if (apiLogo) {
          return {
            logo: apiLogo,
            brandColor: knownBrandData[domain]?.brandColor || defaultData.brandColor
          };
        }
      }
      
      // Then try to fetch favicon as fallback
      if (domain) {
        const favicon = await tryFetchFavicon(domain);
        if (favicon) {
          return {
            logo: favicon,
            brandColor: knownBrandData[domain]?.brandColor || defaultData.brandColor
          };
        }
      }
      
      // If we have partial known data, use it as fallback
      if (domain && knownBrandData[domain]) {
        return {
          logo: knownBrandData[domain].logo || defaultData.logo,
          brandColor: knownBrandData[domain].brandColor || defaultData.brandColor
        };
      }
      
      return defaultData;
    }

    if (!data) {
      console.error('No data returned from scrape-website function');
      
      // First try third-party logo APIs
      if (domain) {
        const apiLogo = await tryFetchFromLogoApis(domain);
        if (apiLogo) {
          return {
            logo: apiLogo,
            brandColor: knownBrandData[domain]?.brandColor || defaultData.brandColor
          };
        }
      }
      
      // Then try to fetch favicon as fallback
      if (domain) {
        const favicon = await tryFetchFavicon(domain);
        if (favicon) {
          return {
            logo: favicon,
            brandColor: knownBrandData[domain]?.brandColor || defaultData.brandColor
          };
        }
      }
      
      // If we have partial known data, use it as fallback
      if (domain && knownBrandData[domain]) {
        return {
          logo: knownBrandData[domain].logo || defaultData.logo,
          brandColor: knownBrandData[domain].brandColor || defaultData.brandColor
        };
      }
      
      return defaultData;
    }

    console.log('Received data from scrape-website function:', data);

    // Accept the logo URL with less validation to improve success rate
    let logo = data.logo || defaultData.logo;
    
    // If logo is invalid or missing, try third-party logo APIs
    if (!logo || logo === 'undefined' || logo.includes('data:,')) {
      console.log('Invalid logo URL from edge function, trying third-party APIs...');
      if (domain) {
        const apiLogo = await tryFetchFromLogoApis(domain);
        if (apiLogo) {
          logo = apiLogo;
          console.log('Using logo from API service:', apiLogo);
        }
      }
    }
    
    // If still invalid but we have a known logo, use that instead
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
    
    // If brand color is missing, undefined, or empty, use black as default
    if (!brandColor || brandColor === 'undefined' || brandColor === '') {
      console.log('Brand color is missing or invalid, using default black');
      brandColor = defaultData.brandColor;
    }
    
    // Use known brand color if available
    if (domain && knownBrandData[domain]?.brandColor) {
      brandColor = knownBrandData[domain].brandColor!;
      console.log('Using known brand color for domain:', domain, brandColor);
    }
    
    // Return with the brand color from the API response, known data, or default black
    return {
      logo,
      brandColor: brandColor || defaultData.brandColor // Ensure black as fallback
    };
  } catch (error) {
    console.error('Error extracting data from website:', error);
    return defaultData;
  }
};
