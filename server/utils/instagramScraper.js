const axios = require('axios');
const puppeteer = require('puppeteer');

const convertFollowers = (text) => {
  const clean = text.replace(/,/g, '').toLowerCase();
  if (clean.includes('m')) return parseInt(parseFloat(clean) * 1000000);
  if (clean.includes('k')) return parseInt(parseFloat(clean) * 1000);
  return parseInt(clean) || 0;
};

const verifyInstagramProfile = async (username) => {
  try {
    const apiResponse = await axios.get(`https://www.instagram.com/${username}/?__a=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Handle API response
    const userData = apiResponse.data?.graphql?.user || apiResponse.data?.user;
    if (userData) {
      return {
        followers: convertFollowers(userData.edge_followed_by?.count.toString()),
        profileExists: true
      };
    }
  } catch (apiError) {
    console.log('API method failed, trying browser scraping...');
  }

  // Fallback to browser scraping
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto(`https://www.instagram.com/${username}/`);
    
    // Get followers from meta tags
    const followers = await page.$eval(
      'meta[property="og:description"]',
      (element) => element.content.match(/([\d,KM]+) Followers/)?.[1] || '0'
    );

    await browser.close();

    return {
      followers: convertFollowers(followers),
      profileExists: followers !== '0'
    };

  } catch (browserError) {
    console.error('Scraping failed:', browserError.message);
    return {
      followers: 0,
      profileExists: false
    };
  }
};

module.exports = { verifyInstagramProfile };