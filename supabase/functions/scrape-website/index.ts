
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
    
    // If we have cached data, return it
    if (existingData) {
      console.log('Found cached data:', existingData);
      return existingData;
    }
    
    // Add protocol if missing
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }
    
    // Get base URL for resolving relative URLs
    const baseUrl = new URL(fullUrl).origin;
    
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
    
    // Extract theme color (used by many mobile browsers)
    let brandColor = '';
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (themeColorMatch && themeColorMatch[1]) {
      brandColor = themeColorMatch[1];
    } else {
      // Try msapplication-TileColor as fallback
      const tileColorMatch = html.match(/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      if (tileColorMatch && tileColorMatch[1]) {
        brandColor = tileColorMatch[1];
      } else {
        // Try CSS variables for primary/brand colors
        const cssColorMatch = html.match(/(:root|body)[^{]*\{[^}]*--(?:primary|brand|main|theme)-color:\s*([^;]+);/i);
        if (cssColorMatch && cssColorMatch[2]) {
          brandColor = cssColorMatch[2].trim();
        } else {
          // Default brand color if none found
          brandColor = '#008F5D';
        }
      }
    }
    
    // Extract domain name for logging
    const domain = extractDomain(url);
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
      brand_color: '#008F5D',
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
