// Global search functionality for FFBuy SpreadSheet

// Define all available product categories and their API endpoints
const productCategories = [
    { name: 'HOT PRODUCTS', endpoint: 'HOT PRODUCTS' },
    { name: 'T-Shirt', endpoint: 'T-Shirt' },
    { name: 'Pants', endpoint: 'Pants' },
    { name: 'Shoes', endpoint: 'Shoes' },
    { name: 'Set', endpoint: 'Set' },
    { name: 'Accessories', endpoint: 'Accessories' },
    { name: 'Hoodie Sweatshirt', endpoint: 'Hoodie.Sweatshirt' }
];

// Global products storage
let globalProducts = [];
let isGlobalSearchActive = true; // Default to global search
let isLoadingGlobalProducts = false;

// Function to initialize global search
function initGlobalSearch() {
    const searchBox = document.querySelector('.search-box');
    const searchIcon = document.querySelector('.search-icon');
    
    if (!searchBox || !searchIcon) return;
    
    // Add event listener to search icon for global search toggle
    searchIcon.addEventListener('click', function() {
        toggleGlobalSearch();
    });
    
    // Add event listener to search box for local search
    searchBox.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (isGlobalSearchActive) {
            performGlobalSearch(searchTerm);
        } else {
            performLocalSearch(searchTerm);
        }
    });
    
    // Add global search indicator
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        const indicator = document.createElement('div');
        indicator.className = 'global-search-indicator active';
        indicator.textContent = 'Global';
        searchContainer.appendChild(indicator);
    }
    
    // If global search is active by default, load all products
    if (isGlobalSearchActive && globalProducts.length === 0 && !isLoadingGlobalProducts) {
        loadAllProducts();
    }
}

// Toggle between global and local search
function toggleGlobalSearch() {
    isGlobalSearchActive = !isGlobalSearchActive;
    
    // Update indicator
    const indicator = document.querySelector('.global-search-indicator');
    if (indicator) {
        indicator.textContent = isGlobalSearchActive ? 'Global' : 'Local';
        indicator.classList.toggle('active', isGlobalSearchActive);
    }
    
    // If switching to global search and we haven't loaded global products yet
    if (isGlobalSearchActive && globalProducts.length === 0 && !isLoadingGlobalProducts) {
        loadAllProducts();
    }
    
    // Apply current search term to new search mode
    const searchBox = document.querySelector('.search-box');
    if (searchBox && searchBox.value.trim() !== '') {
        const searchTerm = searchBox.value.toLowerCase();
        if (isGlobalSearchActive) {
            performGlobalSearch(searchTerm);
        } else {
            performLocalSearch(searchTerm);
        }
    }
}

// Load products from all categories
function loadAllProducts() {
    isLoadingGlobalProducts = true;
    const baseUrl = 'https://opensheet.elk.sh/1hs4cXFLQRhdR8MfQ0vt0oMXhXplksGbU9vzkhO46J6A/';
    const productsContainer = document.getElementById('products-container');
    
    // 移除所有现有的全局加载指示器，确保只有一个
    const existingIndicators = document.querySelectorAll('.global-loading-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // 检查是否已经有其他加载指示器
    const otherLoadingIndicator = document.querySelector('.loading-indicator');
    
    // 只有在没有其他加载指示器的情况下才创建全局加载指示器
    if (!otherLoadingIndicator) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'global-loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading all products...';
        productsContainer.appendChild(loadingIndicator);
    }
    
    // Create promises for all category fetches
    const fetchPromises = productCategories.map(category => {
        // 直接使用原始endpoint，不进行任何替换
        console.log(`Fetching category: ${category.name}, endpoint: ${category.endpoint}`);
        return fetch(baseUrl + category.endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${category.name}`);
                }
                return response.json();
            })
            .then(data => {
                // Filter valid products and add category info
                return data
                    .filter(product => product.spbt && product.ztURL && product.spURL)
                    .map(product => ({
                        ...product,
                        category: category.name,
                        categoryUrl: `${category.endpoint}.html`
                    }));
            })
            .catch(error => {
                console.error(`Error fetching ${category.name}:`, error);
                // 添加更详细的错误日志，包括完整URL和endpoint信息
        console.log(`Failed URL: ${baseUrl + encodedEndpoint}`);
        console.log(`Category endpoint: ${category.endpoint}, Encoded endpoint: ${encodedEndpoint}`);
                return []; // Return empty array on error
            });
    });
    
    // Wait for all fetches to complete
    Promise.all(fetchPromises)
        .then(results => {
            // Combine all results and remove duplicates (based on spURL)
            const allProducts = [];
            const uniqueUrls = new Set();
            
            results.flat().forEach(product => {
                if (!uniqueUrls.has(product.spURL)) {
                    uniqueUrls.add(product.spURL);
                    allProducts.push(product);
                }
            });
            
            globalProducts = allProducts;
            isLoadingGlobalProducts = false;
            
            // 只移除全局加载指示器，不影响其他加载指示器
            const globalLoadingIndicator = document.querySelector('.global-loading-indicator');
            if (globalLoadingIndicator) {
                globalLoadingIndicator.remove();
            }
            
            // If there's an active search term, perform search with loaded data
            const searchBox = document.querySelector('.search-box');
            if (searchBox && searchBox.value.trim() !== '' && isGlobalSearchActive) {
                performGlobalSearch(searchBox.value.toLowerCase());
            }
        });
}

// Perform global search across all products
function performGlobalSearch(searchTerm) {
    if (globalProducts.length === 0) {
        if (!isLoadingGlobalProducts) {
            loadAllProducts();
        }
        return;
    }
    
    const productsContainer = document.getElementById('products-container');
    
    // Clear current products if we're showing search results
    if (searchTerm.trim() !== '') {
        // Save current scroll position
        const scrollPosition = window.scrollY;
        
        // Store original content if this is the first search
        if (!productsContainer.hasAttribute('data-original-content') && !productsContainer.querySelector('.global-search-results')) {
            productsContainer.setAttribute('data-original-content', productsContainer.innerHTML);
        }
        
        // Clear container and add search results header
        productsContainer.innerHTML = '';
        const searchHeader = document.createElement('div');
        searchHeader.className = 'global-search-header';
        searchHeader.innerHTML = `<h2>Global Search Results for "${searchTerm}"</h2>`;
        productsContainer.appendChild(searchHeader);
        
        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'global-search-results';
        productsContainer.appendChild(resultsContainer);
        
        // Filter products by search term
        const matchingProducts = globalProducts.filter(product => 
            product.spbt.toLowerCase().includes(searchTerm)
        );
        
        // Group products by category
        const productsByCategory = {};
        matchingProducts.forEach(product => {
            if (!productsByCategory[product.category]) {
                productsByCategory[product.category] = [];
            }
            productsByCategory[product.category].push(product);
        });
        
        // Display results by category
        if (matchingProducts.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No products found matching your search</div>';
        } else {
            // For each category with results
            Object.keys(productsByCategory).forEach(category => {
                const categoryProducts = productsByCategory[category];
                
                // Create category section
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';
                
                // Add category header with link
                const categoryHeader = document.createElement('h3');
                categoryHeader.className = 'category-header';
                const categoryUrl = categoryProducts[0].categoryUrl;
                categoryHeader.innerHTML = `<a href="${categoryUrl}">${category} <span class="product-count">(${categoryProducts.length})</span></a>`;
                categorySection.appendChild(categoryHeader);
                
                // Add products grid for this category
                const productsGrid = document.createElement('div');
                productsGrid.className = 'products-grid category-products';
                
                // Add products to grid
                categoryProducts.forEach(product => {
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';
                    productCard.classList.add('fade-in');
                    
                    productCard.innerHTML = `
                        <a href="${product.spURL}" target="_blank">
                            <img src="${product.ztURL}" class="product-image" alt="${product.spbt}">
                            <div class="product-info">
                                <div class="product-title">${product.spbt}</div>
                                <div class="product-subtitle">${product.category || 'Premium'} | ${product.brand || 'Quality Product'}</div>
                                
                                <div class="product-note">
                                  <i class="fas fa-external-link-alt"></i> Click to view <strong style="color: #2476db; font-weight:600;">product details</strong>
                                </div>
                                
                                <div class="product-price">
                                    <div>
                                        <span class="us-price">${product.US || '--'}</span>
                                        <span class="eur-price">${product.EUR || '--'}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    `;
                    
                    productsGrid.appendChild(productCard);
                });
                
                categorySection.appendChild(productsGrid);
                resultsContainer.appendChild(categorySection);
            });
        }
        
        // Add back to results button
        const backButton = document.createElement('button');
        backButton.className = 'back-to-results-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Current Category';
        backButton.addEventListener('click', function() {
            // Clear search box
            const searchBox = document.querySelector('.search-box');
            if (searchBox) {
                searchBox.value = '';
            }
            
            // Restore original content
            if (productsContainer.hasAttribute('data-original-content')) {
                productsContainer.innerHTML = productsContainer.getAttribute('data-original-content');
                productsContainer.removeAttribute('data-original-content');
            }
        });
        
        searchHeader.prepend(backButton);
        
        // Restore scroll position
        window.scrollTo(0, 0);
    } else {
        // If search is cleared, restore original content
        if (productsContainer.hasAttribute('data-original-content')) {
            productsContainer.innerHTML = productsContainer.getAttribute('data-original-content');
            productsContainer.removeAttribute('data-original-content');
        }
    }
}

// Perform local search (current page only)
function performLocalSearch(searchTerm) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const title = card.querySelector('.product-title').textContent.toLowerCase();
        
        if (title.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize global search when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initGlobalSearch();
});