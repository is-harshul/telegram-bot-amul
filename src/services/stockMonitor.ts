import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { StockStatus, ProductInfo } from "../types";

export class StockMonitor {
  private readonly productUrl: string;
  private lastStatus: StockStatus | null = null;
  private userPincode?: string;

  constructor(productUrl: string, userPincode?: string) {
    this.productUrl = productUrl;
    this.userPincode = userPincode;
  }

  async checkStock(): Promise<StockStatus> {
    try {
      console.log(
        `🔍 [StockMonitor] Starting stock check for: ${this.productUrl}`
      );

      // Try with Puppeteer first for better JavaScript rendering
      const status = await this.checkWithPuppeteer();
      console.log(`📊 [StockMonitor] Puppeteer result:`, status);
      this.lastStatus = status;
      return status;
    } catch (error) {
      console.error("❌ [StockMonitor] Error checking stock:", error);
      const errorStatus: StockStatus = {
        isInStock: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      this.lastStatus = errorStatus;
      return errorStatus;
    }
  }

  private async checkWithPuppeteer(): Promise<StockStatus> {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Navigate to the product page
      await page.goto(this.productUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for the page to load completely
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Handle PIN code modal if present
      await this.handlePinCodeModal(page);

      // Extract product information
      const productInfo = await page.evaluate(() => {
        // Look for stock status indicators using the specific selectors provided
        const soldOutAlert = document.querySelector("div.alert.alert-danger");
        const notifyMeButton = document.querySelector(
          'button.product_enquiry[data-bs-toggle="modal"][data-bs-target="#enquiryModal"]'
        );
        const addToCartButton = document.querySelector(
          "a.btn.btn-primary.add-to-cart"
        );

        // Additional fallback selectors
        const outOfStockText = document.querySelector(
          '[class*="out-of-stock"], [class*="unavailable"], .stock-unavailable'
        );

        // More comprehensive search for out-of-stock indicators
        const allButtons = document.querySelectorAll("button");
        const allAlerts = document.querySelectorAll("div.alert");
        const allAddToCartButtons = document.querySelectorAll(
          'a[class*="add-to-cart"], button[class*="add-to-cart"]'
        );

        console.log("🔍 Debug - All buttons found:", allButtons.length);
        console.log("🔍 Debug - All alerts found:", allAlerts.length);
        console.log(
          "🔍 Debug - All add to cart buttons found:",
          allAddToCartButtons.length
        );

        // Log all button texts
        allButtons.forEach((btn, index) => {
          console.log(
            `🔍 Debug - Button ${index}:`,
            btn.textContent?.trim(),
            btn.className
          );
        });

        // Log all alert texts
        allAlerts.forEach((alert, index) => {
          console.log(
            `🔍 Debug - Alert ${index}:`,
            alert.textContent?.trim(),
            alert.className
          );
        });

        // Log all add to cart button states
        allAddToCartButtons.forEach((btn, index) => {
          console.log(
            `🔍 Debug - Add to cart ${index}:`,
            btn.textContent?.trim(),
            btn.className,
            btn.hasAttribute("disabled")
          );
        });
        const priceElement = document.querySelector(
          '[class*="price"], .product-price, [data-testid="price"]'
        );
        const productNameElement = document.querySelector(
          'h1, .product-title, [class*="product-name"]'
        );

        console.log("🔍 Debug - Sold out alert found:", soldOutAlert);
        console.log(
          "🔍 Debug - Sold out alert text:",
          soldOutAlert?.textContent
        );
        console.log("🔍 Debug - Notify me button found:", notifyMeButton);
        console.log(
          "🔍 Debug - Notify me button text:",
          notifyMeButton?.textContent
        );
        console.log("🔍 Debug - Add to cart button found:", addToCartButton);
        console.log(
          "🔍 Debug - Add to cart disabled:",
          addToCartButton?.hasAttribute("disabled")
        );
        console.log("🔍 Debug - Out of stock text found:", outOfStockText);

        // Check if product is out of stock based on the specific elements
        const isOutOfStock =
          soldOutAlert?.textContent?.includes("Sold Out") ||
          notifyMeButton?.textContent?.includes("Notify Me") ||
          addToCartButton?.hasAttribute("disabled") ||
          outOfStockText;

        console.log("🔍 Debug - Is out of stock:", isOutOfStock);
        console.log(
          "🔍 Debug - Add to cart button disabled attribute:",
          addToCartButton?.getAttribute("disabled")
        );

        // If button is disabled (has disabled attribute), product is out of stock
        // disabled="0" means button is enabled (product in stock)
        // disabled="1" or just "disabled" means button is disabled (product out of stock)
        const isInStock = addToCartButton?.getAttribute("disabled") === "0";
        const price = priceElement?.textContent?.trim() || "";
        const productName =
          productNameElement?.textContent?.trim() ||
          "Amul High Protein Buttermilk";

        return {
          isInStock: Boolean(isInStock),
          price,
          productName,
          availability: isInStock ? "In Stock" : "Out of Stock",
          soldOutAlert: soldOutAlert?.textContent?.trim(),
        };
      });

      return {
        isInStock: productInfo.isInStock,
        lastChecked: new Date(),
        price: productInfo.price || undefined,
        availability: productInfo.availability,
        soldOutAlert: productInfo.soldOutAlert,
      };
    } finally {
      await browser.close();
    }
  }

  // Reusable method to handle PIN code modal
  private async handlePinCodeModal(page: any): Promise<void> {
    try {
      console.log("🔍 Looking for PIN code modal...");

      // Use the most specific selector for the input
      let foundSelector = "";
      const pinSelector = "#search";
      let pinInput = null;
      try {
        pinInput = await page.waitForSelector(pinSelector, { timeout: 3000 });
        if (pinInput) {
          foundSelector = pinSelector;
          console.log(`✅ Found PIN input with selector: ${pinSelector}`);
        }
      } catch (e) {
        // fallback to previous logic if not found
      }
      if (!pinInput) {
        // fallback to previous logic
        const pinSelectors = [
          'input[type="text"]',
          'input[type="number"]',
          'input[name*="pincode"]',
          'input[name*="pin"]',
          'input[placeholder*="PIN" i]',
          'input[placeholder*="pincode" i]',
          'input[placeholder*="Enter" i]',
          'input[class*="pincode"]',
          'input[class*="pin"]',
          'input[id*="pincode"]',
          'input[id*="pin"]',
          ".pincode-input input",
          ".pin-input input",
          "input",
        ];
        for (const selector of pinSelectors) {
          try {
            pinInput = await page.waitForSelector(selector, { timeout: 2000 });
            if (pinInput) {
              foundSelector = selector;
              console.log(`✅ Found PIN input with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      }

      if (pinInput) {
        // Wait for the modal to be fully visible and interactive
        console.log("⏳ Waiting for PIN modal to be ready...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Use page.evaluate to dispatch a real click event on the input
        console.log("🖱️ Dispatching real click event on PIN input...");
        await page.evaluate((selector: string) => {
          const input = document.querySelector(selector);
          if (input) {
            const rect = input.getBoundingClientRect();
            const clickEvent = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
            });
            input.dispatchEvent(clickEvent);
            (input as HTMLElement).focus();
          }
        }, foundSelector);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Set the value directly and dispatch input/change events
        console.log(
          "⌨️ Setting PIN code value directly and dispatching events..."
        );
        await page.evaluate(
          (selector: string, pincode: string) => {
            const input = document.querySelector(
              selector
            ) as HTMLInputElement | null;
            if (input) {
              input.value = pincode;
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
            }
          },
          foundSelector,
          this.userPincode || "135001"
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Wait for the dropdown option to appear (up to 2 seconds)
        console.log("🔍 Waiting for location dropdown option...");
        await page.waitForSelector("#automatic .searchitem-name .item-name", {
          timeout: 2000,
        });

        // Find and click the correct dropdown option
        const dropdownClicked = await page.evaluate((pincode: string) => {
          const items = Array.from(
            document.querySelectorAll("#automatic .searchitem-name")
          );
          for (const item of items) {
            const text = item.querySelector(".item-name")?.textContent?.trim();
            if (text === pincode) {
              (item as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, this.userPincode || "135001");
        if (dropdownClicked) {
          console.log(
            `🖱️ Clicked dropdown option for ${this.userPincode || "135001"}`
          );
        } else {
          console.log(
            `⚠️ Could not find dropdown option for ${
              this.userPincode || "135001"
            }, trying Enter...`
          );
          await page.keyboard.press("Enter");
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try to find and click the submit button (if still needed)
        const buttonSelectors = [
          'button[type="submit"]',
          'button:contains("Submit")',
          'button:contains("Continue")',
          'button:contains("Go")',
          'button:contains("Check")',
          ".btn",
          ".submit",
          '[class*="submit"]',
          '[class*="confirm"]',
          '[class*="continue"]',
          "button",
        ];

        let submitButton = null;
        for (const btnSelector of buttonSelectors) {
          try {
            submitButton = await page.$(btnSelector);
            if (submitButton) {
              console.log(
                `✅ Found submit button with selector: ${btnSelector}`
              );
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (submitButton) {
          console.log("🖱️ Clicking submit button...");
          await submitButton.click();
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for modal to close
          console.log("✅ PIN code submitted successfully");
        }

        // Wait for the modal to disappear
        console.log("⏳ Waiting for PIN modal to disappear...");
        await page.waitForFunction(
          () => {
            const modal = document
              .querySelector('input[type="text"]')
              ?.closest(
                'div[role="dialog"], .modal, .MuiDialog-root, .ant-modal, .ReactModal__Content'
              );
            return !modal || (modal as HTMLElement).offsetParent === null;
          },
          { timeout: 10000 }
        );
        console.log("✅ PIN modal closed, proceeding...");
      } else {
        console.log("ℹ️ No PIN code input found, proceeding...");
      }
    } catch (e) {
      console.log(
        "ℹ️ PIN code modal handling failed:",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
  }

  private async checkWithCheerio(): Promise<StockStatus> {
    const response = await axios.get(this.productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Look for stock indicators using the specific selectors provided
    const soldOutAlert = $("div.alert.alert-danger.mt-3");
    const notifyMeButton = $(
      'button.btn.btn-primary.product_enquiry.mb-md-3.fs-6.btn-lg[data-bs-toggle="modal"][data-bs-target="#enquiryModal"]'
    );
    const addToCartButton = $(
      'a.btn.btn-primary.d-flex.align-items-center.justify-content-center.h-100.border-0.w-100.add-to-cart.flex-fill.px-2.py-2.disabled[disabled="true"]'
    );

    // Additional fallback selectors
    const outOfStockText = $(
      '[class*="out-of-stock"], [class*="unavailable"], .stock-unavailable'
    );
    const priceElement = $(
      '[class*="price"], .product-price, [data-testid="price"]'
    );

    // Check if product is out of stock based on the specific elements
    const isOutOfStock =
      soldOutAlert.length > 0 ||
      notifyMeButton.length > 0 ||
      addToCartButton.length > 0 ||
      outOfStockText.length > 0;

    const isInStock = !isOutOfStock;
    const price = priceElement.first().text().trim();

    return {
      isInStock,
      lastChecked: new Date(),
      price: price || undefined,
      availability: isInStock ? "In Stock" : "Out of Stock",
    };
  }

  getLastStatus(): StockStatus | null {
    return this.lastStatus;
  }

  async getProductInfo(): Promise<ProductInfo> {
    const status = await this.checkStock();
    return {
      name: "Amul High Protein Buttermilk 200ml (Pack of 30)",
      price: status.price || "Price not available",
      availability: status.availability || "Unknown",
      url: this.productUrl,
    };
  }
}
