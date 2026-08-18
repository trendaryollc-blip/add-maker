/* ============================================================
   OMNI backend — src/services/scraper.js
   Web scraping service for product pages. Extracts title, price,
   description, images, reviews, and structured data.
   Uses cheerio + axios. Falls back to basic fetch when needed.
   ============================================================ */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT = 15000;

/**
 * Fetch a URL with proper headers and timeout.
 */
async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate'
    },
    maxRedirects: 5
  });
  return response.data;
}

/**
 * Extract product data from a page's HTML.
 * @param {string} html - Raw HTML
 * @param {string} url - Source URL
 * @returns {object} Structured product data
 */
function extractProduct(html, url) {
  const $ = cheerio.load(html);
  const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();

  // Extract from JSON-LD structured data (most reliable)
  let jsonLd = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Product' || (data['@graph'] && data['@graph'].find(g => g['@type'] === 'Product'))) {
        jsonLd = data['@type'] === 'Product' ? data : data['@graph'].find(g => g['@type'] === 'Product');
      }
    } catch (_e) {}
  });

  // Product name
  const name = jsonLd?.name
    || $('meta[property="og:title"]').attr('content')
    || $('h1').first().text().trim()
    || $('title').text().trim()
    || 'Unknown Product';

  // Price
  let price = '';
  if (jsonLd?.offers?.price) {
    price = `${jsonLd.offers.priceCurrency || '$'}${jsonLd.offers.price}`;
  } else if (jsonLd?.offers?.lowPrice) {
    price = `${jsonLd.offers.priceCurrency || '$'}${jsonLd.offers.lowPrice}`;
  } else {
    const priceEl = $('[class*="price"], [data-price], [itemprop="price"]').first();
    price = priceEl.text().trim() || $('[class*="Price"]').first().text().trim() || '';
  }

  // Description
  const description = jsonLd?.description
    || $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || $('[class*="description"], [itemprop="description"]').first().text().trim()
    || '';

  // Images
  const images = [];
  if (jsonLd?.image) {
    const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    images.push(...imgs.slice(0, 5));
  }
  if (images.length === 0) {
    $('meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr('content');
      if (src) images.push(src);
    });
  }
  if (images.length === 0) {
    $('[class*="product"] img, [itemprop="image"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('icon') && !src.includes('logo')) images.push(src);
    });
  }

  // Rating
  let rating = 0;
  let reviewCount = 0;
  if (jsonLd?.aggregateRating) {
    rating = parseFloat(jsonLd.aggregateRating.ratingValue) || 0;
    reviewCount = parseInt(jsonLd.aggregateRating.reviewCount) || 0;
  } else {
    const ratingEl = $('[class*="rating"], [itemprop="ratingValue"]').first();
    rating = parseFloat(ratingEl.text()) || 0;
    const countEl = $('[class*="review-count"], [itemprop="reviewCount"]').first();
    reviewCount = parseInt(countEl.text().replace(/\D/g, '')) || 0;
  }

  // Category
  const category = jsonLd?.category
    || $('meta[property="product:category"]').attr('content')
    || $('[class*="breadcrumb"] a').last().text().trim()
    || '';

  // Brand
  const brand = jsonLd?.brand?.name
    || $('meta[property="product:brand"]').attr('content')
    || $('[class*="brand"]').first().text().trim()
    || '';

  return {
    name: name.substring(0, 255),
    url,
    host,
    price,
    description: description.substring(0, 2000),
    images: images.slice(0, 5),
    rating,
    reviewCount,
    category,
    brand,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Extract reviews from a product page.
 * @param {string} html - Raw HTML
 * @returns {string[]} Array of review text snippets
 */
function extractReviews(html) {
  const $ = cheerio.load(html);
  const reviews = [];

  // Common review selectors
  const selectors = [
    '[class*="review-text"]', '[class*="review-body"]',
    '[class*="ReviewText"]', '[class*="ReviewBody"]',
    '[itemprop="reviewBody"]', '[data-hook="review-body"]',
    '.review', '.comment-text'
  ];

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && text.length < 2000) {
        reviews.push(text);
      }
    });
    if (reviews.length >= 20) break;
  }

  // If no reviews found in HTML, try JSON-LD
  if (reviews.length === 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Review' || data.reviewBody) {
          reviews.push(data.reviewBody || '');
        }
        if (Array.isArray(data.review)) {
          data.review.forEach(r => {
            if (r.reviewBody) reviews.push(r.reviewBody);
          });
        }
      } catch (_e) {}
    });
  }

  return reviews.filter(r => r.length > 0).slice(0, 30);
}

/**
 * Scrape a product page and return structured data.
 * @param {string} url
 * @returns {Promise<{product: object, reviews: string[]}>}
 */
async function scrapeProduct(url) {
  try {
    const html = await fetchPage(url);
    const product = extractProduct(html, url);
    const reviews = extractReviews(html);
    return { product, reviews };
  } catch (err) {
    return {
      product: {
        name: 'Unknown Product',
        url,
        host: (() => { try { return new URL(url).hostname; } catch { return ''; } })(),
        price: '',
        description: '',
        images: [],
        rating: 0,
        reviewCount: 0,
        category: '',
        brand: '',
        scrapedAt: new Date().toISOString(),
        scrapeError: err.message
      },
      reviews: []
    };
  }
}

module.exports = { scrapeProduct, extractProduct, extractReviews, fetchPage };
