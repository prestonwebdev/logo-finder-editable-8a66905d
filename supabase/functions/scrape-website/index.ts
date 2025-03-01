
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

// Advanced logo extraction function with multiple fallback strategies
async function extractLogo(html: string, baseUrl: string): Promise<string> {
  // Strategy 1: Try to find structured data (JSON-LD)
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      // Look for logo in various JSON-LD formats
      const logo = jsonData.logo || 
                  (jsonData.organization && jsonData.organization.logo) || 
                  (jsonData.publisher && jsonData.publisher.logo);
      
      if (logo && typeof logo === 'string') {
        return makeUrlAbsolute(logo, baseUrl);
      }
    } catch (e) {
      console.log('JSON-LD parsing error:', e);
    }
  }
  
  // Strategy 2: Look for Apple touch icons (usually high quality)
  const appleTouchIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon(-precomposed)?["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (appleTouchIconMatch && appleTouchIconMatch[2]) {
    return makeUrlAbsolute(appleTouchIconMatch[2], baseUrl);
  }
  
  // Strategy 3: Look for favicon with .ico, .png or other extensions
  const faviconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (faviconMatch && faviconMatch[2]) {
    return makeUrlAbsolute(faviconMatch[2], baseUrl);
  }
  
  // Strategy 4: Look for Open Graph image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogImageMatch && ogImageMatch[1]) {
    return makeUrlAbsolute(ogImageMatch[1], baseUrl);
  }
  
  // Strategy 5: Look for Twitter image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (twitterImageMatch && twitterImageMatch[1]) {
    return makeUrlAbsolute(twitterImageMatch[1], baseUrl);
  }
  
  // Strategy 6: Check for a default /favicon.ico which many sites have
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
        // Default brand color if none found
        brandColor = '#008F5D';
      }
    }
    
    // Attempt to determine industry (this is harder and less reliable)
    // For now, use a simplified approach based on keywords
    let industry = 'Technology'; // Default
    
    const industryKeywords = {
      'finance|banking|investment|insurance|capital|wealth|money|payment|credit|loan': 'Finance',
      'health|healthcare|medical|wellness|fitness|doctor|hospital|clinic|patient|pharmacy': 'Healthcare',
      'retail|shop|store|buy|purchase|ecommerce|e-commerce|product|shopping': 'Retail',
      'travel|hotel|booking|flight|vacation|tourism|trip|holiday|destination': 'Travel',
      'food|restaurant|dining|cuisine|meal|recipe|menu|cook|chef|eat': 'Food & Dining',
      'education|learning|course|university|school|college|academy|student|teach|class': 'Education',
      'media|news|entertainment|film|movie|music|game|stream|video|podcast': 'Media & Entertainment',
      'real estate|property|home|apartment|housing|rent|mortgage|house|building': 'Real Estate',
      'marketing|advertising|agency|brand|campaign|design|creative|studio': 'Marketing & Creative',
      'legal|law|attorney|lawyer|firm|counsel|litigation|court': 'Legal Services',
      'consulting|business service|professional service|solution|strategy': 'Business Services',
      'technology|software|app|digital|tech|data|cloud|IT|computer|internet': 'Technology',
      'manufacturing|industrial|factory|production|engineering|machine': 'Manufacturing',
      'nonprofit|charity|foundation|community|donate|volunteer': 'Nonprofit',
      'government|public|official|administration|policy': 'Government'
    };
    
    for (const [keywords, industryName] of Object.entries(industryKeywords)) {
      const regex = new RegExp(keywords, 'i');
      if (regex.test(html)) {
        industry = industryName;
        break;
      }
    }
    
    // Extract domain name for logging
    const domain = extractDomain(url);
    console.log(`Extracted data for ${domain}:`, { logoUrl, industry, brandColor });
    
    // Create result object
    const result = {
      url,
      logo: logoUrl,
      industry,
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
      industry: 'Technology',
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
