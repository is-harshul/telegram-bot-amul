import { AmulProduct } from '../types';

export const AMUL_PRODUCTS: AmulProduct[] = [
  {
    id: 'high-protein-buttermilk-200ml-30pack',
    name: 'Amul High Protein Buttermilk 200ml (Pack of 30)',
    description: 'High protein buttermilk with 8g protein per 200ml serving',
    url: 'https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30',
    category: 'Buttermilk',
    price: '₹1,200'
  },
  {
    id: 'high-protein-buttermilk-200ml-6pack',
    name: 'Amul High Protein Buttermilk 200ml (Pack of 6)',
    description: 'High protein buttermilk with 8g protein per 200ml serving',
    url: 'https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-6',
    category: 'Buttermilk',
    price: '₹240'
  },
  {
    id: 'high-protein-milk-1l',
    name: 'Amul High Protein Milk 1L',
    description: 'High protein milk with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-milk-1l',
    category: 'Milk',
    price: '₹120'
  },
  {
    id: 'high-protein-milk-500ml',
    name: 'Amul High Protein Milk 500ml',
    description: 'High protein milk with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-milk-500ml',
    category: 'Milk',
    price: '₹60'
  },
  {
    id: 'high-protein-curd-400g',
    name: 'Amul High Protein Curd 400g',
    description: 'High protein curd with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-curd-400g',
    category: 'Curd',
    price: '₹80'
  },
  {
    id: 'high-protein-curd-200g',
    name: 'Amul High Protein Curd 200g',
    description: 'High protein curd with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-curd-200g',
    category: 'Curd',
    price: '₹40'
  },
  {
    id: 'high-protein-paneer-200g',
    name: 'Amul High Protein Paneer 200g',
    description: 'High protein paneer with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-paneer-200g',
    category: 'Paneer',
    price: '₹100'
  },
  {
    id: 'high-protein-paneer-100g',
    name: 'Amul High Protein Paneer 100g',
    description: 'High protein paneer with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-paneer-100g',
    category: 'Paneer',
    price: '₹50'
  },
  {
    id: 'high-protein-cheese-200g',
    name: 'Amul High Protein Cheese 200g',
    description: 'High protein cheese with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-cheese-200g',
    category: 'Cheese',
    price: '₹120'
  },
  {
    id: 'high-protein-cheese-100g',
    name: 'Amul High Protein Cheese 100g',
    description: 'High protein cheese with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-cheese-100g',
    category: 'Cheese',
    price: '₹60'
  },
  {
    id: 'high-protein-ghee-1kg',
    name: 'Amul High Protein Ghee 1kg',
    description: 'High protein ghee with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-ghee-1kg',
    category: 'Ghee',
    price: '₹600'
  },
  {
    id: 'high-protein-ghee-500g',
    name: 'Amul High Protein Ghee 500g',
    description: 'High protein ghee with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-ghee-500g',
    category: 'Ghee',
    price: '₹300'
  },
  {
    id: 'high-protein-butter-100g',
    name: 'Amul High Protein Butter 100g',
    description: 'High protein butter with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-butter-100g',
    category: 'Butter',
    price: '₹80'
  },
  {
    id: 'high-protein-butter-500g',
    name: 'Amul High Protein Butter 500g',
    description: 'High protein butter with enhanced protein content',
    url: 'https://shop.amul.com/en/product/amul-high-protein-butter-500g',
    category: 'Butter',
    price: '₹400'
  }
];

export function getProductById(id: string): AmulProduct | undefined {
  return AMUL_PRODUCTS.find(product => product.id === id);
}

export function getProductsByCategory(category: string): AmulProduct[] {
  return AMUL_PRODUCTS.filter(product => product.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(AMUL_PRODUCTS.map(product => product.category))];
}

export function searchProducts(query: string): AmulProduct[] {
  const lowercaseQuery = query.toLowerCase();
  return AMUL_PRODUCTS.filter(product => 
    product.name.toLowerCase().includes(lowercaseQuery) ||
    product.description.toLowerCase().includes(lowercaseQuery) ||
    product.category.toLowerCase().includes(lowercaseQuery)
  );
} 