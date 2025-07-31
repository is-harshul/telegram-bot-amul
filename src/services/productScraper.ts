import puppeteer from "puppeteer";
import { AmulProduct } from "../types";

export class ProductScraper {
  private readonly collectionUrl =
    "https://shop.amul.com/en/collection/power-of-protein";
  private isScraping = false;

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
        await page.evaluate((selector: string) => {
          const input = document.querySelector(
            selector
          ) as HTMLInputElement | null;
          if (input) {
            input.value = "135001";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, foundSelector);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Wait for the dropdown option to appear (up to 2 seconds)
        console.log("🔍 Waiting for location dropdown option...");
        await page.waitForSelector("#automatic .searchitem-name .item-name", {
          timeout: 2000,
        });

        // Find and click the correct dropdown option
        const dropdownClicked = await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll("#automatic .searchitem-name")
          );
          for (const item of items) {
            const text = item.querySelector(".item-name")?.textContent?.trim();
            if (text === "135001") {
              (item as HTMLElement).click();
              return true;
            }
          }
          return false;
        });
        if (dropdownClicked) {
          console.log("🖱️ Clicked dropdown option for 135001");
        } else {
          console.log(
            "⚠️ Could not find dropdown option for 135001, trying Enter..."
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

  async scrapeProducts(): Promise<AmulProduct[]> {
    if (this.isScraping) {
      console.log("[scrapeProducts] Already scraping, skipping...");
      return [];
    }

    this.isScraping = true;
    console.log("[scrapeProducts] Starting Puppeteer browser...");
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      console.log("[scrapeProducts] Navigating to collection URL...");
      await page.goto(this.collectionUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait a bit for the page to fully load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Handle PIN code modal if present
      await this.handlePinCodeModal(page);

      // Wait for the product grid/list to load
      console.log("🔍 Waiting for products to load...");
      await page.waitForSelector(
        '[class*="product"], [class*="item"], .product-item, .product-card, .product',
        { timeout: 15000 }
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Extract product information
      console.log("🔍 Extracting product information...");
      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll(
          '[class*="product"], [class*="item"], .product-item, .product-card, .product'
        );
        console.log(`Found ${productElements.length} product elements`);

        const scrapedProducts: any[] = [];
        productElements.forEach((element, index) => {
          try {
            const nameElement = element.querySelector(
              'h1, h2, h3, h4, [class*="title"], [class*="name"]'
            );
            const priceElement = element.querySelector(
              '[class*="price"], .price, [data-testid="price"]'
            );
            const linkElement = element.querySelector('a[href*="/product/"]');
            const imageElement = element.querySelector("img");
            const name = nameElement?.textContent?.trim();
            const price = priceElement?.textContent?.trim();
            const url = linkElement?.getAttribute("href");
            const imageUrl = imageElement?.getAttribute("src");
            if (name && url) {
              let category = "Other";
              const lowerName = name.toLowerCase();
              const lowerUrl = url.toLowerCase();
              if (
                lowerName.includes("buttermilk") ||
                lowerUrl.includes("buttermilk")
              ) {
                category = "Buttermilk";
              } else if (
                lowerName.includes("milk") ||
                lowerUrl.includes("milk")
              ) {
                category = "Milk";
              } else if (
                lowerName.includes("curd") ||
                lowerUrl.includes("curd")
              ) {
                category = "Curd";
              } else if (
                lowerName.includes("paneer") ||
                lowerUrl.includes("paneer")
              ) {
                category = "Paneer";
              } else if (
                lowerName.includes("cheese") ||
                lowerUrl.includes("cheese")
              ) {
                category = "Cheese";
              } else if (
                lowerName.includes("ghee") ||
                lowerUrl.includes("ghee")
              ) {
                category = "Ghee";
              } else if (
                lowerName.includes("butter") ||
                lowerUrl.includes("butter")
              ) {
                category = "Butter";
              } else if (
                lowerName.includes("protein") ||
                lowerUrl.includes("protein")
              ) {
                category = "Protein";
              } else if (
                lowerName.includes("shake") ||
                lowerUrl.includes("shake")
              ) {
                category = "Shake";
              } else if (
                lowerName.includes("whey") ||
                lowerUrl.includes("whey")
              ) {
                category = "Whey";
              }

              scrapedProducts.push({
                id: `product_${index + 1}`,
                name: name,
                description: name,
                price: price || "Price not available",
                category: category,
                url: url.startsWith("http")
                  ? url
                  : `https://shop.amul.com${url}`,
                imageUrl: imageUrl || undefined,
                isInStock: true,
              });
            }
          } catch (error) {
            console.error(`Error processing product element ${index}:`, error);
          }
        });

        return scrapedProducts;
      });

      console.log(
        `[scrapeProducts] Scraped ${products.length} products from the collection`
      );
      return products;
    } catch (error) {
      console.error("[scrapeProducts] Error during scraping:", error);
      throw error;
    } finally {
      await browser.close();
      console.log("[scrapeProducts] Browser closed.");
      this.isScraping = false;
    }
  }

  async scrapeProductDetails(
    productUrl: string
  ): Promise<Partial<AmulProduct>> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.goto(productUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Handle PIN code modal if present
      await this.handlePinCodeModal(page);

      const details = await page.evaluate(() => {
        const nameElement = document.querySelector(
          'h1, .product-title, [class*="product-name"]'
        );
        const priceElement = document.querySelector(
          '[class*="price"], .product-price, [data-testid="price"]'
        );
        const descriptionElement = document.querySelector(
          '[class*="description"], .product-description, [class*="details"]'
        );
        const imageElement = document.querySelector(
          '.product-image img, [class*="product-image"] img'
        );

        return {
          name: nameElement?.textContent?.trim(),
          price: priceElement?.textContent?.trim(),
          description: descriptionElement?.textContent?.trim(),
          imageUrl: imageElement?.getAttribute("src") || undefined,
        };
      });

      return details;
    } catch (error) {
      console.error("❌ Error scraping product details:", error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async updateProductCatalog(): Promise<AmulProduct[]> {
    console.log(
      "🔄 [updateProductCatalog] Updating product catalog from Amul website..."
    );
    const timeoutMs = 5 * 60 * 1000; // 5 minutes
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<AmulProduct[]>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error("[updateProductCatalog] Timeout after 5 minutes"));
      }, timeoutMs);
    });
    const mainPromise = (async () => {
      try {
        console.log("[updateProductCatalog] Calling scrapeProducts...");
        const products = await this.scrapeProducts();
        console.log(
          `[updateProductCatalog] scrapeProducts returned ${products.length} products`
        );

        // Skip individual product detail scraping to avoid timeouts
        console.log(
          "[updateProductCatalog] Skipping individual product detail scraping to avoid timeouts"
        );
        console.log(
          `[updateProductCatalog] Returning ${products.length} products from collection page`
        );
        return products;
      } catch (error) {
        console.error(
          "[updateProductCatalog] Error updating product catalog:",
          error
        );
        throw error;
      }
    })();
    try {
      const result = await Promise.race([mainPromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      return result;
    } catch (error) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error("[updateProductCatalog] Final error or timeout:", error);
      throw error;
    }
  }
}

if (require.main === module) {
  (async () => {
    const scraper = new ProductScraper();
    await scraper.scrapeProducts();
  })();
}
