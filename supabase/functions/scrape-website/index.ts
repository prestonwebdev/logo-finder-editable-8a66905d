
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

// Advanced logo extraction function with multiple fallback strategies
async function extractLogo(html: string, baseUrl: string): Promise<string> {
  console.log('Extracting logo for', baseUrl);
  
  // Strategy 1: Look for images in navigation elements (new primary strategy)
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
  
  // Strategy 2: Try to find structured data (JSON-LD)
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
  
  // Strategy 3: Look for Apple touch icons (usually high quality)
  const appleTouchIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon(-precomposed)?["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (appleTouchIconMatch && appleTouchIconMatch[2]) {
    console.log('Found Apple touch icon:', appleTouchIconMatch[2]);
    return makeUrlAbsolute(appleTouchIconMatch[2], baseUrl);
  }
  
  // Strategy 4: Look for favicon with .ico, .png or other extensions
  const faviconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (faviconMatch && faviconMatch[2]) {
    console.log('Found favicon:', faviconMatch[2]);
    return makeUrlAbsolute(faviconMatch[2], baseUrl);
  }
  
  // Strategy 5: Look for Open Graph image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogImageMatch && ogImageMatch[1]) {
    console.log('Found OG image:', ogImageMatch[1]);
    return makeUrlAbsolute(ogImageMatch[1], baseUrl);
  }
  
  // Strategy 6: Look for Twitter image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (twitterImageMatch && twitterImageMatch[1]) {
    console.log('Found Twitter image:', twitterImageMatch[1]);
    return makeUrlAbsolute(twitterImageMatch[1], baseUrl);
  }
  
  // Strategy 7: Any SVG in the page (might be logos)
  const svgMatch = html.match(/<img[^>]*src=["']([^"']+\.svg)["'][^>]*>/i);
  if (svgMatch && svgMatch[1]) {
    console.log('Found SVG image:', svgMatch[1]);
    return makeUrlAbsolute(svgMatch[1], baseUrl);
  }
  
  // Strategy 8: Check for any small PNG images that might be logos
  const smallPngMatch = html.match(/<img[^>]*src=["']([^"']+\.png)["'][^>]*>/i);
  if (smallPngMatch && smallPngMatch[1]) {
    console.log('Found PNG image:', smallPngMatch[1]);
    return makeUrlAbsolute(smallPngMatch[1], baseUrl);
  }
  
  // Strategy 9: Check for a default /favicon.ico which many sites have
  console.log('Using default favicon.ico as fallback');
  return `${baseUrl}/favicon.ico`;
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
  
  // Default color if no brand color found - not a generic green, using a more neutral blue
  return '#0052CC';
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
      return existingData;
    }
    
    // Fetch the website HTML
    console.log(`Fetching URL: ${fullUrl}`);
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract logo URL using enhanced strategy
    const logoUrl = await extractLogo(html, baseUrl);
    
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
    // Return default values on error
    return {
      url,
      logo: '/placeholder.svg',
      brand_color: '#0052CC', // Using a more neutral blue as default
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
