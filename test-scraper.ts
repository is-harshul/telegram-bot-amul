import { ProductScraper } from './src/services/productScraper';

async function testScraper() {
  console.log('🚀 Starting scraper test...');
  
  const scraper = new ProductScraper();
  
  try {
    const products = await scraper.scrapeProducts();
    console.log('✅ Scraping completed successfully!');
    console.log(`📦 Found ${products.length} products:`);
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   Price: ${product.price}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   URL: ${product.url}`);
      console.log(`   Image: ${product.imageUrl}`);
    });
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  }
}

testScraper(); 