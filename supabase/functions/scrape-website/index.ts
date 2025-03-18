import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.0";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the admin key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Known brand colors for popular websites
const knownBrandColors: Record<string, string> = {
  'apple.com': '#000000',
  'google.com': '#4285F4',
  'amazon.com': '#FF9900',
  'microsoft.com': '#00A4EF',
  'facebook.com': '#1877F2',
  'twitter.com': '#1DA1F2',
  'netflix.com': '#E50914',
  'spotify.com': '#1DB954',
  'instagram.com': '#C13584',
  'adobe.com': '#FF0000',
  'youtube.com': '#FF0000',
  'linkedin.com': '#0A66C2',
  'github.com': '#181717',
  'coca-cola.com': '#E61A27',
  'pepsi.com': '#004883',
  'mcdonalds.com': '#FFC72C',
  'starbucks.com': '#00704A',
  'nike.com': '#111111',
  'adidas.com': '#000000',
  'airbnb.com': '#FF5A5F',
  'uber.com': '#000000',
  'intel.com': '#0071C5',
  'ibm.com': '#0F62FE',
  'nasa.gov': '#FC3D21',
  'walmart.com': '#0071CE',
  'target.com': '#CC0000',
  'samsung.com': '#1428A0',
  'canon.com': '#BC0024',
  'sony.com': '#000000',
  'dell.com': '#007DB8',
  'hp.com': '#0096D6',
  'oracle.com': '#C74634',
  'cisco.com': '#1BA0D7',
};

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch (error) {
    console.error('Error extracting domain:', error);
    return '';
  }
}

// Find navigation elements based on common selectors and HTML structures
function findNavigationElements(html: string): string[] {
  const navSelectors = [
    '<nav[^>]*>.*?<\/nav>',
    '<header[^>]*>.*?<\/header>',
    '<div[^>]*class=["\'].*?[header|navigation|navbar|nav-bar|top-bar|menu].*?["\'].*?>.*?<\/div>',
    '<ul[^>]*class=["\'].*?[nav|navbar|menu|main-menu].*?["\'].*?>.*?<\/ul>'
  ];
  
  let navElements: string[] = [];
  
  for (const selector of navSelectors) {
    const regex = new RegExp(selector, 'gis');
    const matches = html.match(regex);
    if (matches) {
      navElements = [...navElements, ...matches];
    }
  }
  
  return navElements;
}

// Extract images from navigation elements
function extractImagesFromNav(html: string): string[] {
  const navElements = findNavigationElements(html);
  let images: string[] = [];
  
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  
  for (const navElement of navElements) {
    let match;
    while ((match = imgRegex.exec(navElement)) !== null) {
      if (match[1] && !match[1].includes('data:image/svg+xml')) {
        images.push(match[1]);
      }
    }
  }
  
  return images;
}

// Check if a favicon URL exists and can be accessed
async function validateFaviconUrl(url: string): Promise<boolean> {
  try {
    console.log(`Validating favicon URL: ${url}`);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.log(`Failed to validate favicon URL: ${url}`);
    return false;
  }
}

// Function to extract images with specific class names or alt text that might be logos
function extractLogoByClassOrAlt(html: string): string[] {
  const potentialLogoImages: string[] = [];
  
  // Look for images with class names suggesting they are logos
  const logoClassRegex = /<img[^>]*class=["'][^"']*(?:logo|brand|site-logo)[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = logoClassRegex.exec(html)) !== null) {
    if (match[1]) {
      potentialLogoImages.push(match[1]);
    }
  }
  
  // Look for images with alt text suggesting they are logos
  const logoAltRegex = /<img[^>]*alt=["'][^"']*(?:logo|brand)[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = logoAltRegex.exec(html)) !== null) {
    if (match[1]) {
      potentialLogoImages.push(match[1]);
    }
  }
  
  return potentialLogoImages;
}

// Function to try logo retrieval from third-party services
async function tryThirdPartyLogoServices(domain: string): Promise<string | null> {
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
    
    // Try Google's favicon service (doesn't require API key)
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    try {
      const response = await fetch(googleFaviconUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`Found logo via Google Favicon: ${googleFaviconUrl}`);
        return googleFaviconUrl;
      }
    } catch (err) {
      console.log('Google favicon service failed, trying other sources...');
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
      console.log('FaviconKit API failed');
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from third-party services:', error);
    return null;
  }
}

// Advanced logo extraction function with multiple fallback strategies
async function extractLogo(html: string, baseUrl: string, domain: string): Promise<string> {
  console.log('Extracting logo for', baseUrl);
  
  // Strategy 1: Try third-party logo services first
  const thirdPartyLogo = await tryThirdPartyLogoServices(domain);
  if (thirdPartyLogo) {
    console.log('Using logo from third-party service:', thirdPartyLogo);
    return thirdPartyLogo;
  }
  
  // Strategy 2: Look for images with logo-related class names or alt text
  const logoByClassOrAlt = extractLogoByClassOrAlt(html);
  if (logoByClassOrAlt.length > 0) {
    console.log('Found logo by class or alt text:', logoByClassOrAlt[0]);
    return makeUrlAbsolute(logoByClassOrAlt[0], baseUrl);
  }
  
  // Strategy 3: Look for images in navigation elements
  const navImages = extractImagesFromNav(html);
  console.log('Found navigation images:', navImages.length);
  
  // Filter for likely logo images (typically small, contain words like 'logo')
  const likelyLogoImages = navImages.filter(img => 
    img.toLowerCase().includes('logo') || 
    !img.toLowerCase().includes('banner') || 
    !img.toLowerCase().includes('hero')
  );
  
  if (likelyLogoImages.length > 0) {
    console.log('Found likely logo in navigation:', likelyLogoImages[0]);
    return makeUrlAbsolute(likelyLogoImages[0], baseUrl);
  }
  
  // Strategy 4: Try to find structured data (JSON-LD)
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      // Look for logo in various JSON-LD formats
      const logo = jsonData.logo || 
                  (jsonData.organization && jsonData.organization.logo) || 
                  (jsonData.publisher && jsonData.publisher.logo);
      
      if (logo && typeof logo === 'string') {
        console.log('Found logo in JSON-LD:', logo);
        return makeUrlAbsolute(logo, baseUrl);
      }
    } catch (e) {
      console.log('JSON-LD parsing error:', e);
    }
  }
  
  // Strategy 5: Look for SVG logos directly in the HTML
  const svgLogoRegex = /<svg[^>]*(?:class|id)=["'].*?(?:logo|brand).*?["'][^>]*>.*?<\/svg>/is;
  const svgMatch = html.match(svgLogoRegex);
  if (svgMatch && svgMatch[0]) {
    console.log('Found inline SVG logo in HTML');
    // Convert SVG to a data URL (simplified for now)
    return `data:image/svg+xml,${encodeURIComponent(svgMatch[0])}`;
  }
  
  // Strategy 6: Look for Apple touch icons (usually high quality)
  const appleTouchIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon(-precomposed)?["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (appleTouchIconMatch && appleTouchIconMatch[2]) {
    const iconUrl = makeUrlAbsolute(appleTouchIconMatch[2], baseUrl);
    console.log('Found Apple touch icon:', iconUrl);
    
    // Validate that the icon URL is accessible
    if (await validateFaviconUrl(iconUrl)) {
      return iconUrl;
    }
  }
  
  // Strategy 7: Look for link elements with rel="icon" or rel="shortcut icon"
  const faviconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (faviconMatch && faviconMatch[2]) {
    const iconUrl = makeUrlAbsolute(faviconMatch[2], baseUrl);
    console.log('Found favicon in HTML:', iconUrl);
    
    // Validate that the icon URL is accessible
    if (await validateFaviconUrl(iconUrl)) {
      return iconUrl;
    }
  }
  
  // Strategy 8: Try common favicon locations
  const faviconLocations = [
    `${baseUrl}/favicon.ico`,
    `${baseUrl}/favicon.png`,
    `${baseUrl}/apple-touch-icon.png`,
    `${baseUrl}/apple-icon.png`,
    `${baseUrl}/icon.png`,
    `${baseUrl}/site-icon.png`
  ];
  
  for (const location of faviconLocations) {
    if (await validateFaviconUrl(location)) {
      console.log('Found favicon at common location:', location);
      return location;
    }
  }
  
  // Strategy 9: Look for Open Graph image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogImageMatch && ogImageMatch[1]) {
    console.log('Found OG image:', ogImageMatch[1]);
    return makeUrlAbsolute(ogImageMatch[1], baseUrl);
  }
  
  // Strategy 10: Look for Twitter image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (twitterImageMatch && twitterImageMatch[1]) {
    console.log('Found Twitter image:', twitterImageMatch[1]);
    return makeUrlAbsolute(twitterImageMatch[1], baseUrl);
  }
  
  // Strategy 11: Any SVG in the page (might be logos)
  const svgMatch2 = html.match(/<img[^>]*src=["']([^"']+\.svg)["'][^>]*>/i);
  if (svgMatch2 && svgMatch2[1]) {
    console.log('Found SVG image:', svgMatch2[1]);
    return makeUrlAbsolute(svgMatch2[1], baseUrl);
  }
  
  // Strategy 12: Check for any small PNG images that might be logos
  const smallPngMatch = html.match(/<img[^>]*src=["']([^"']+\.png)["'][^>]*>/i);
  if (smallPngMatch && smallPngMatch[1]) {
    console.log('Found PNG image:', smallPngMatch[1]);
    return makeUrlAbsolute(smallPngMatch[1], baseUrl);
  }
  
  // Default to Google's favicon service as last resort
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// Make relative URLs absolute
function makeUrlAbsolute(url: string, baseUrl: string): string {
  try {
    if (url.startsWith('data:')) {
      return url; // Already a data URL
    }
    
    const urlObj = new URL(url, baseUrl);
    return urlObj.href;
  } catch (e) {
    console.error('Error making URL absolute:', e);
    return url;
  }
}

// Extract brand color from CSS or HTML
function extractBrandColor(html: string, domain: string): string {
  console.log(`Extracting brand color for ${domain}`);
  
  // Check if we have a known brand color for this domain
  if (knownBrandColors[domain]) {
    console.log(`Using known brand color for ${domain}: ${knownBrandColors[domain]}`);
    return knownBrandColors[domain];
  }
  
  // Strategy 1: Extract theme-color meta tag
  const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (themeColorMatch && themeColorMatch[1]) {
    console.log('Found theme-color:', themeColorMatch[1]);
    return themeColorMatch[1];
  }
  
  // Strategy 2: Try msapplication-TileColor
  const tileColorMatch = html.match(/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (tileColorMatch && tileColorMatch[1]) {
    console.log('Found msapplication-TileColor:', tileColorMatch[1]);
    return tileColorMatch[1];
  }
  
  // Strategy 3: Look for CSS variables for primary/brand colors
  const cssVarPatterns = [
    /(:root|body)[^{]*\{[^}]*--(?:primary|brand|main|theme)-color:\s*([^;]+);/i,
    /\.(?:primary|brand|main|theme)-color\s*\{[^}]*color:\s*([^;]+);/i,
    /\.(?:primary|brand|main|theme)\s*\{[^}]*color:\s*([^;]+);/i,
    /\.(?:primary|brand|main|theme)-bg\s*\{[^}]*background(?:-color)?:\s*([^;]+);/i,
    /\.(?:header|navbar|nav|navigation)\s*\{[^}]*background(?:-color)?:\s*([^;]+);/i,
    /\.(?:btn|button)-(?:primary|brand|main|theme)\s*\{[^}]*background(?:-color)?:\s*([^;]+);/i
  ];
  
  for (const pattern of cssVarPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log('Found CSS color variable:', match[1]);
      return match[1].trim();
    }
  }
  
  // Default color if no brand color found - using black
  return '#000000';
}

// Special case for domain-specific logo handling
function getDomainSpecificLogo(domain: string): string | null {
  // Add specific logos for domains where we know the API fails
  const domainSpecificLogos: Record<string, string> = {
    'apple.com': 'https://www.apple.com/favicon.ico'
  };

  return domainSpecificLogos[domain] || null;
}

// Main function to scrape website and extract data
async function scrapeWebsite(url: string) {
  console.log(`Scraping website: ${url}`);
  
  try {
    // Check if we already have data for this URL in our database
    const { data: existingData, error: lookupError } = await supabase
      .from('website_data')
      .select('*')
      .eq('url', url)
      .maybeSingle();
    
    if (lookupError) {
      console.error('Error looking up existing data:', lookupError);
    }
    
    // Add protocol if missing
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }
    
    // Get base URL for resolving relative URLs
    const baseUrl = new URL(fullUrl).origin;
    const domain = extractDomain(url);
    
    // Check for domain-specific logo
    const domainSpecificLogo = getDomainSpecificLogo(domain);
    
    // If we have cached data and a domain-specific logo that's better, update it
    if (existingData && domainSpecificLogo) {
      console.log(`Updating cached data with domain-specific logo for ${domain}`);
      
      // Update the record with the domain-specific logo
      const { error: updateError } = await supabase
        .from('website_data')
        .update({ logo: domainSpecificLogo })
        .eq('id', existingData.id);
        
      if (updateError) {
        console.error('Error updating website data:', updateError);
      } else {
        console.log('Successfully updated website data with domain-specific logo');
        // Return the updated data
        return {
          ...existingData,
          logo: domainSpecificLogo
        };
      }
    }
    
    // If we have cached data, but it's using the default color and we know the brand color,
    // update it with the known brand color
    if (existingData) {
      if (existingData.brand_color === '#008F5D' && knownBrandColors[domain]) {
        console.log(`Updating cached data with known brand color for ${domain}`);
        
        // Update the record with the known brand color
        const { error: updateError } = await supabase
          .from('website_data')
          .update({ brand_color: knownBrandColors[domain] })
          .eq('id', existingData.id);
          
        if (updateError) {
          console.error('Error updating website data:', updateError);
        } else {
          console.log('Successfully updated website data with known brand color');
          // Return the updated data
          return {
            ...existingData,
            brand_color: knownBrandColors[domain]
          };
        }
      }
      
      console.log('Found cached data:', existingData);
      
      // If we have a domain specific logo, override the cached data
      if (domainSpecificLogo) {
        return {
          ...existingData,
          logo: domainSpecificLogo
        };
      }
      
      // If the logo in existing data is a placeholder, try to get a better one
      if (!existingData.logo || existingData.logo === '/placeholder.svg') {
        // Try third-party logo services
        const thirdPartyLogo = await tryThirdPartyLogoServices(domain);
        if (thirdPartyLogo) {
          console.log(`Updating cached data with third-party logo for ${domain}`);
          
          // Update the record with the third-party logo
          const { error: updateError } = await supabase
            .from('website_data')
            .update({ logo: thirdPartyLogo })
            .eq('id', existingData.id);
            
          if (updateError) {
            console.error('Error updating website data:', updateError);
          } else {
            console.log('Successfully updated website data with third-party logo');
            return {
              ...existingData,
              logo: thirdPartyLogo
            };
          }
        }
      }
      
      return existingData;
    }
    
    // Try third-party logo services first before fetching the website
    const thirdPartyLogo = await tryThirdPartyLogoServices(domain);
    if (thirdPartyLogo) {
      console.log('Using logo from third-party service:', thirdPartyLogo);
      
      // Create result object
      const result = {
        url,
        logo: thirdPartyLogo,
        brand_color: knownBrandColors[domain] || '#000000',
      };
      
      // Store in database for future use
      const { error: insertError } = await supabase
        .from('website_data')
        .insert([result]);
      
      if (insertError) {
        console.error('Error storing website data:', insertError);
      } else {
        console.log('Successfully stored website data from third-party service');
      }
      
      return result;
    }
    
    // Fetch the website HTML
    console.log(`Fetching URL: ${fullUrl}`);
    let html = '';
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      }
      
      html = await response.text();
    } catch (fetchError) {
      console.error('Error fetching website HTML:', fetchError);
      
      // Use domain-specific logo as fallback or return default values
      return {
        url,
        logo: domainSpecificLogo || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        brand_color: knownBrandColors[domain] || '#000000',
      };
    }
    
    // Use domain-specific logo if available, otherwise extract logo URL using enhanced strategy
    const logoUrl = domainSpecificLogo || await extractLogo(html, baseUrl, domain);
    
    // Extract brand color with known colors for popular sites
    const brandColor = extractBrandColor(html, domain);
    
    console.log(`Extracted data for ${domain}:`, { logoUrl, brandColor });
    
    // Create result object
    const result = {
      url,
      logo: logoUrl,
      brand_color: brandColor,
    };
    
    // Store in database for future use
    const { error: insertError } = await supabase
      .from('website_data')
      .insert([result]);
    
    if (insertError) {
      console.error('Error storing website data:', insertError);
    } else {
      console.log('Successfully stored website data');
    }
    
    return result;
  } catch (error) {
    console.error('Error scraping website:', error);
    
    // Check if we have a domain-specific logo for fallback
    const domain = extractDomain(url);
    const domainSpecificLogo = getDomainSpecificLogo(domain);
    
    // Try third-party logo services as a last resort
    const thirdPartyLogo = await tryThirdPartyLogoServices(domain);
    
    // Return default values on error, but use domain-specific logo if available
    return {
      url,
      logo: domainSpecificLogo || thirdPartyLogo || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      brand_color: knownBrandColors[domain] || '#000000',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  
  try {
    if (req.method === 'POST') {
      const { url } = await req.json();
      
      if (!url) {
        return new Response(
          JSON.stringify({ error: 'URL is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const websiteData = await scrapeWebsite(url);
      
      return new Response(
        JSON.stringify(websiteData),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
