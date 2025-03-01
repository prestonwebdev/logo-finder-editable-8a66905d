
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
    
    // Extract logo URL (look for common logo patterns in meta tags and links)
    let logoUrl = '';
    
    // Try apple-touch-icon first
    const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    if (appleIconMatch && appleIconMatch[1]) {
      logoUrl = appleIconMatch[1];
    }
    
    // If no apple icon, try icon or shortcut icon
    if (!logoUrl) {
      const iconMatch = html.match(/<link[^>]*rel=["'](icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      if (iconMatch && iconMatch[2]) {
        logoUrl = iconMatch[2];
      }
    }
    
    // If still no logo, try Open Graph image
    if (!logoUrl) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      if (ogImageMatch && ogImageMatch[1]) {
        logoUrl = ogImageMatch[1];
      }
    }
    
    // Make logo URL absolute if it's relative
    if (logoUrl && !logoUrl.startsWith('http')) {
      const baseUrl = new URL(fullUrl);
      if (logoUrl.startsWith('/')) {
        logoUrl = `${baseUrl.protocol}//${baseUrl.host}${logoUrl}`;
      } else {
        logoUrl = `${baseUrl.protocol}//${baseUrl.host}/${logoUrl}`;
      }
    }
    
    // If we couldn't find a logo, use a default
    if (!logoUrl) {
      logoUrl = '/placeholder.svg';
    }
    
    // Extract theme color (used by many mobile browsers)
    let brandColor = '';
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (themeColorMatch && themeColorMatch[1]) {
      brandColor = themeColorMatch[1];
    } else {
      // Default brand color if none found
      brandColor = '#008F5D';
    }
    
    // Attempt to determine industry (this is harder and less reliable)
    // For now, use a simplified approach based on keywords
    let industry = 'Technology'; // Default
    
    const industryKeywords = {
      'finance|banking|investment|insurance|capital|wealth': 'Finance',
      'health|healthcare|medical|wellness|fitness|doctor|hospital': 'Healthcare',
      'retail|shop|store|buy|purchase|ecommerce|e-commerce': 'Retail',
      'travel|hotel|booking|flight|vacation|tourism': 'Travel',
      'food|restaurant|dining|cuisine|meal|recipe': 'Food & Dining',
      'education|learning|course|university|school|college|academy': 'Education',
      'media|news|entertainment|film|movie|music|game': 'Media & Entertainment',
      'real estate|property|home|apartment|housing': 'Real Estate',
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
