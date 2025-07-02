import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { StockStatus, ProductInfo } from '../types';

export class StockMonitor {
  private readonly productUrl: string;
  private lastStatus: StockStatus | null = null;

  constructor(productUrl: string) {
    this.productUrl = productUrl;
  }

  async checkStock(): Promise<StockStatus> {
    try {
      console.log(`Checking stock for: ${this.productUrl}`);
      
      // Try with Puppeteer first for better JavaScript rendering
      const status = await this.checkWithPuppeteer();
      this.lastStatus = status;
      return status;
    } catch (error) {
      console.error('Error checking stock:', error);
      const errorStatus: StockStatus = {
        isInStock: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.lastStatus = errorStatus;
      return errorStatus;
    }
  }

  private async checkWithPuppeteer(): Promise<StockStatus> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the product page
      await page.goto(this.productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the page to load completely
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract product information
      const productInfo = await page.evaluate(() => {
        // Look for stock status indicators
        const addToCartButton = document.querySelector('button[data-testid="add-to-cart"], .add-to-cart, [class*="add-to-cart"]');
        const outOfStockText = document.querySelector('[class*="out-of-stock"], [class*="unavailable"], .stock-unavailable');
        const priceElement = document.querySelector('[class*="price"], .product-price, [data-testid="price"]');
        const productNameElement = document.querySelector('h1, .product-title, [class*="product-name"]');
        
        const isInStock = !outOfStockText && addToCartButton && !addToCartButton.hasAttribute('disabled');
        const price = priceElement?.textContent?.trim() || '';
        const productName = productNameElement?.textContent?.trim() || 'Amul High Protein Buttermilk';
        
        return {
          isInStock: Boolean(isInStock),
          price,
          productName,
          availability: isInStock ? 'In Stock' : 'Out of Stock'
        };
      });
      
      return {
        isInStock: productInfo.isInStock,
        lastChecked: new Date(),
        price: productInfo.price || undefined,
        availability: productInfo.availability
      };
      
    } finally {
      await browser.close();
    }
  }

  private async checkWithCheerio(): Promise<StockStatus> {
    const response = await axios.get(this.productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Look for stock indicators
    const addToCartButton = $('button[data-testid="add-to-cart"], .add-to-cart, [class*="add-to-cart"]');
    const outOfStockText = $('[class*="out-of-stock"], [class*="unavailable"], .stock-unavailable');
    const priceElement = $('[class*="price"], .product-price, [data-testid="price"]');
    
    const isInStock = outOfStockText.length === 0 && addToCartButton.length > 0;
    const price = priceElement.first().text().trim();
    
    return {
      isInStock,
      lastChecked: new Date(),
      price: price || undefined,
      availability: isInStock ? 'In Stock' : 'Out of Stock'
    };
  }

  getLastStatus(): StockStatus | null {
    return this.lastStatus;
  }

  async getProductInfo(): Promise<ProductInfo> {
    const status = await this.checkStock();
    return {
      name: 'Amul High Protein Buttermilk 200ml (Pack of 30)',
      price: status.price || 'Price not available',
      availability: status.availability || 'Unknown',
      url: this.productUrl
    };
  }
} 