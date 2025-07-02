import puppeteer from 'puppeteer';
import { AmulCredentials, CartOperation } from '../types';

export class CartAutomation {
  private readonly credentials: AmulCredentials;
  private readonly productUrl: string;

  constructor(credentials: AmulCredentials, productUrl: string) {
    this.credentials = credentials;
    this.productUrl = productUrl;
  }

  async addToCart(): Promise<CartOperation> {
    const browser = await puppeteer.launch({
      headless: false, // Set to false for debugging, true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to login page
      await page.goto('https://shop.amul.com/en/customer/account/login', { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Wait for login form to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fill in login credentials
      await page.type('input[name="email"], input[type="email"], #email', this.credentials.email);
      await page.type('input[name="password"], input[type="password"], #password', this.credentials.password);
      
      // Click login button
      const loginButton = await page.$('button[type="submit"], .login-button, [class*="login"]');
      if (loginButton) {
        await loginButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Check if login was successful
      const isLoggedIn = await page.evaluate(() => {
        return !document.querySelector('input[name="email"]') && 
               !document.querySelector('input[type="email"]');
      });

      if (!isLoggedIn) {
        return {
          success: false,
          message: 'Failed to login to Amul account. Please check your credentials.'
        };
      }

      // Navigate to product page
      await page.goto(this.productUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if product is in stock
      const isInStock = await page.evaluate(() => {
        const addToCartButton = document.querySelector('button[data-testid="add-to-cart"], .add-to-cart, [class*="add-to-cart"]');
        const outOfStockText = document.querySelector('[class*="out-of-stock"], [class*="unavailable"]');
        return !outOfStockText && addToCartButton && !addToCartButton.hasAttribute('disabled');
      });

      if (!isInStock) {
        return {
          success: false,
          message: 'Product is not in stock. Cannot add to cart.'
        };
      }

      // Add to cart
      const addToCartButton = await page.$('button[data-testid="add-to-cart"], .add-to-cart, [class*="add-to-cart"]');
      if (addToCartButton) {
        await addToCartButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Check if item was added to cart
      const cartUrl = await page.url();
      const isInCart = await page.evaluate(() => {
        const cartIndicator = document.querySelector('[class*="cart"], [class*="basket"], .cart-count');
        return cartIndicator && cartIndicator.textContent && parseInt(cartIndicator.textContent) > 0;
      });

      if (isInCart) {
        return {
          success: true,
          message: 'Product successfully added to cart!',
          cartUrl: 'https://shop.amul.com/en/checkout/cart'
        };
      } else {
        return {
          success: false,
          message: 'Failed to add product to cart. Please try manually.'
        };
      }

    } catch (error) {
      console.error('Error in cart automation:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      await browser.close();
    }
  }

  async checkCartStatus(): Promise<CartOperation> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Login first
      await page.goto('https://shop.amul.com/en/customer/account/login', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await page.type('input[name="email"], input[type="email"], #email', this.credentials.email);
      await page.type('input[name="password"], input[type="password"], #password', this.credentials.password);
      
      const loginButton = await page.$('button[type="submit"], .login-button, [class*="login"]');
      if (loginButton) {
        await loginButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Navigate to cart
      await page.goto('https://shop.amul.com/en/checkout/cart', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const cartInfo = await page.evaluate(() => {
        const cartItems = document.querySelectorAll('[class*="cart-item"], .cart-item, .item');
        const totalElement = document.querySelector('[class*="total"], .cart-total, .total');
        
        return {
          itemCount: cartItems.length,
          total: totalElement?.textContent?.trim() || 'Unknown'
        };
      });

      return {
        success: true,
        message: `Cart contains ${cartInfo.itemCount} items. Total: ${cartInfo.total}`,
        cartUrl: 'https://shop.amul.com/en/checkout/cart'
      };

    } catch (error) {
      return {
        success: false,
        message: `Error checking cart: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      await browser.close();
    }
  }
} 