import { AmulProduct, UserProductSelection } from "../types";
import {
  AMUL_PRODUCTS,
  getProductById,
  getProductsByCategory,
  getAllCategories,
  searchProducts,
} from "../config/products";
import { ProductScraper } from "./productScraper";

export class ProductManager {
  private userSelections: Map<string, UserProductSelection> = new Map();
  private products: AmulProduct[] = AMUL_PRODUCTS;
  private scraper: ProductScraper;
  private lastUpdated: Date | null = null;

  constructor() {
    this.scraper = new ProductScraper();
  }

  // Get all available products
  getAllProducts(): AmulProduct[] {
    return this.products;
  }

  // Get products by category
  getProductsByCategory(category: string): AmulProduct[] {
    return this.products.filter((product) => product.category === category);
  }

  // Get all categories
  getAllCategories(): string[] {
    return [...new Set(this.products.map((product) => product.category))];
  }

  // Search products
  searchProducts(query: string): AmulProduct[] {
    const lowercaseQuery = query.toLowerCase();
    return this.products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get product by ID
  getProductById(id: string): AmulProduct | undefined {
    return this.products.find((product) => product.id === id);
  }

  // Refresh product catalog from website
  async refreshCatalog(): Promise<{
    success: boolean;
    message: string;
    productCount?: number;
  }> {
    try {
      console.log("🔄 [refreshCatalog] Start refreshing product catalog...");
      const newProducts = await this.scraper.updateProductCatalog();
      console.log(
        `[refreshCatalog] updateProductCatalog returned ${newProducts.length} products`
      );

      if (newProducts.length > 0) {
        this.products = newProducts;
        this.lastUpdated = new Date();
        console.log(
          `[refreshCatalog] Catalog updated successfully with ${newProducts.length} products`
        );
        return {
          success: true,
          message: `✅ Product catalog updated successfully! Found ${newProducts.length} products.`,
          productCount: newProducts.length,
        };
      } else {
        console.log("[refreshCatalog] No products found after update.");
        return {
          success: false,
          message:
            "❌ No products found. Please check the website or try again later.",
        };
      }
    } catch (error) {
      console.error("[refreshCatalog] Error refreshing catalog:", error);
      return {
        success: false,
        message: `❌ Failed to refresh catalog: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  // Get last update time
  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }

  // Set user's selected product
  setUserProduct(userId: string, productId: string): boolean {
    const product = this.getProductById(productId);
    if (!product) {
      return false;
    }

    const selection: UserProductSelection = {
      userId,
      selectedProductId: productId,
      productName: product.name,
      productUrl: product.url,
      lastChecked: new Date(),
    };

    this.userSelections.set(userId, selection);
    return true;
  }

  // Get user's selected product
  getUserProduct(userId: string): UserProductSelection | undefined {
    return this.userSelections.get(userId);
  }

  // Update user's product last checked time
  updateUserProductLastChecked(userId: string): void {
    const selection = this.userSelections.get(userId);
    if (selection) {
      selection.lastChecked = new Date();
      this.userSelections.set(userId, selection);
    }
  }

  // Remove user's product selection
  removeUserProduct(userId: string): boolean {
    return this.userSelections.delete(userId);
  }

  // Format product list for display with pagination
  formatProductList(
    products: AmulProduct[],
    page: number = 1,
    itemsPerPage: number = 10
  ): { text: string; totalPages: number; currentPage: number } {
    if (products.length === 0) {
      return { text: "❌ No products found.", totalPages: 1, currentPage: 1 };
    }

    const totalPages = Math.ceil(products.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = products.slice(startIndex, endIndex);

    const productList = pageProducts
      .map((product, index) => {
        try {
          // Escape HTML special characters
          const escapeHtml = (text: string | undefined | null): string => {
            if (!text) return "";
            return text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
          };

          const name = escapeHtml(product.name);
          const description = escapeHtml(product.description);
          const category = escapeHtml(product.category);
          const price = product.price ? ` - ${escapeHtml(product.price)}` : "";

          return `${
            startIndex + index + 1
          }. <b>${name}</b>${price}\n   📝 ${description}\n   🏷️ ${category}\n`;
        } catch (error) {
          console.error(
            `[ProductManager] Error formatting product ${startIndex + index}:`,
            error
          );
          return `${startIndex + index + 1}. <b>Product ${
            startIndex + index + 1
          }</b>\n   📝 Error formatting product\n   🏷️ Unknown\n`;
        }
      })
      .join("\n");

    const paginationInfo =
      totalPages > 1
        ? `\n📄 Page ${page} of ${totalPages} (${products.length} total products)`
        : `\n📦 Total: ${products.length} products`;

    return {
      text: productList + paginationInfo,
      totalPages,
      currentPage: page,
    };
  }

  // Format category list for display
  formatCategoryList(): string {
    const categories = this.getAllCategories();
    return categories
      .map((category, index) => {
        const productCount = this.getProductsByCategory(category).length;
        return `${index + 1}. <b>${category}</b> (${productCount} products)`;
      })
      .join("\n");
  }

  // Format user's current selection
  formatUserSelection(userId: string): string {
    const selection = this.getUserProduct(userId);
    if (!selection) {
      return "❌ No product selected. Use /products to browse and select a product.";
    }

    const product = this.getProductById(selection.selectedProductId);
    if (!product) {
      return "❌ Selected product not found. Please select a new product.";
    }

    const lastChecked = selection.lastChecked
      ? `\n🕒 Last checked: ${selection.lastChecked.toLocaleString()}`
      : "";

    return `
📦 <b>Currently Monitoring:</b>

<b>${product.name}</b>
📝 ${product.description}
🏷️ Category: ${product.category}
💰 Price: ${product.price || "Not available"}
🔗 Product URL: ${product.url}${lastChecked}

Use /status to check current stock status.
    `.trim();
  }

  // Get product selection keyboard markup
  getProductSelectionKeyboard(): any {
    const categories = this.getAllCategories();
    const keyboard = categories.map((category) => [
      {
        text: category,
        callback_data: `category_${category}`,
      },
    ]);

    return {
      inline_keyboard: keyboard,
    };
  }

  // Get products keyboard markup for a category with pagination
  getProductsKeyboard(
    category: string,
    page: number = 1,
    itemsPerPage: number = 10
  ): any {
    try {
      const products = this.getProductsByCategory(category);
      const totalPages = Math.ceil(products.length / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageProducts = products.slice(startIndex, endIndex);

      const keyboard = pageProducts.map((product) => {
        try {
          // Truncate product name if too long (Telegram has limits)
          const displayName =
            product.name && product.name.length > 50
              ? product.name.substring(0, 47) + "..."
              : product.name || "Unknown Product";

          return [
            {
              text: displayName,
              callback_data: `product_${product.id}`,
            },
          ];
        } catch (error) {
          console.error(
            `[ProductManager] Error creating keyboard button for product ${product.id}:`,
            error
          );
          return [
            {
              text: "Unknown Product",
              callback_data: `product_${product.id}`,
            },
          ];
        }
      });

      // Add pagination buttons if needed
      if (totalPages > 1) {
        const paginationRow = [];

        if (page > 1) {
          paginationRow.push({
            text: "⬅️ Previous",
            callback_data: `category_page_${category}_${page - 1}`,
          });
        }

        if (page < totalPages) {
          paginationRow.push({
            text: "Next ➡️",
            callback_data: `category_page_${category}_${page + 1}`,
          });
        }

        if (paginationRow.length > 0) {
          keyboard.push(paginationRow);
        }
      }

      // Add back button
      keyboard.push([
        {
          text: "⬅️ Back to Categories",
          callback_data: "back_to_categories",
        },
      ]);

      return {
        inline_keyboard: keyboard,
      };
    } catch (error) {
      console.error(
        `[ProductManager] Error creating keyboard for category ${category}:`,
        error
      );
      return {
        inline_keyboard: [
          [
            {
              text: "⬅️ Back to Categories",
              callback_data: "back_to_categories",
            },
          ],
        ],
      };
    }
  }

  // Format catalog status
  formatCatalogStatus(): string {
    const totalProducts = this.products.length;
    const categories = this.getAllCategories();
    const lastUpdate = this.lastUpdated
      ? `\n🕒 Last updated: ${this.lastUpdated.toLocaleString()}`
      : "\n🕒 Never updated (using default catalog)";

    return `
📊 <b>Product Catalog Status</b>

📦 Total Products: ${totalProducts}
🏷️ Categories: ${categories.length}
${categories
  .map(
    (cat) => `   • ${cat} (${this.getProductsByCategory(cat).length} products)`
  )
  .join("\n")}${lastUpdate}

Use /refresh_catalog to update from the website.
    `.trim();
  }
}
