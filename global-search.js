// Global search functionality for FFBuy SpreadSheet

// 获取分类配置 - 使用全局CONFIG
function getSearchCategories() {
    // 如果CONFIG已加载，使用CONFIG中的分类配置
    if (typeof CONFIG !== 'undefined' && CONFIG.categories) {
        return CONFIG.categories.map(cat => ({
            name: cat.name,
            endpoint: cat.endpoint
        }));
    }
    
    // 后备分类配置
    return [
        { name: 'HOTPRODUCTS', endpoint: 'HOTPRODUCTS' },
        { name: 'T-Shirt', endpoint: 'T-Shirt' },
        { name: 'Pants', endpoint: 'Pants' },
        { name: 'Shoes', endpoint: 'Shoes' },
        { name: 'Set', endpoint: 'Set' },
        { name: 'Accessories', endpoint: 'Accessories' },
        { name: 'Hoodie Sweatshirt', endpoint: 'Hoodie.Sweatshirt' }
    ];
}

// 移除重复的categories声明，直接使用getSearchCategories()函数

// Global products storage
let globalProducts = [];
let isGlobalSearchActive = true; // Default to global search
let isLoadingGlobalProducts = false;

// ------------------------------
// Popular search term tracking (localStorage per device)
// ------------------------------
const POPULAR_TERMS_KEY = 'ffbuy_popular_terms';
const POPULAR_API_BASE = (typeof CONFIG !== 'undefined' && CONFIG.POPULAR && CONFIG.POPULAR.BASE_URL)
    ? CONFIG.POPULAR.BASE_URL
    : '';

function readPopularTerms() {
    try {
        const raw = localStorage.getItem(POPULAR_TERMS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function writePopularTerms(map) {
    try {
        localStorage.setItem(POPULAR_TERMS_KEY, JSON.stringify(map));
    } catch (e) {
        // ignore quota errors
    }
}

function recordSearchTerm(term) {
    const t = (term || '').toLowerCase().trim();
    if (!t) return;
    const now = Date.now();
    const map = readPopularTerms();
    const current = map[t] || { count: 0, lastAt: 0, display: term };
    current.count += 1;
    current.lastAt = now;
    // Keep the first non-empty display text
    if (!current.display && term) current.display = term;
    map[t] = current;
    writePopularTerms(map);

    // 同步到后端（Cloudflare Workers），失败不影响本地记录
    if (POPULAR_API_BASE) {
        try {
            fetch(`${POPULAR_API_BASE}/events/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term })
            }).catch(() => {});
        } catch (e) {
            // ignore network errors
        }
    }
}

function getPopularTerms(limit = 15) {
    const map = readPopularTerms();
    const arr = Object.keys(map).map(k => ({ term: k, count: map[k].count || 0, lastAt: map[k].lastAt || 0, display: map[k].display || k }));
    arr.sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt));
    return arr.slice(0, limit);
}

async function renderPopularListFromStorage() {
    const ul = document.getElementById('popularList');
    if (!ul) return;
    let terms = [];

    // 优先尝试从后端获取全站热搜
    if (POPULAR_API_BASE) {
        try {
            const url = `${POPULAR_API_BASE}/popular?limit=15`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.terms)) {
                    terms = data.terms.map(t => ({ term: t.term, display: t.display || t.term, count: t.count || 0 }));
                }
            }
        } catch (e) {
            // 网络失败时回退到本地统计
        }
    }

    // 若后端不可用或返回为空：
    // - 当已配置POPULAR_API_BASE时，不回退到本地，保持只使用全站数据
    // - 当未配置POPULAR_API_BASE时，回退到本地统计
    if (!terms.length && !POPULAR_API_BASE) {
        terms = getPopularTerms(15);
    }

    // 如果仍无数据，则保留预设列表
    if (!terms.length) return;

    // 清空并以安全的 DOM API 重建
    ul.innerHTML = '';
    terms.forEach(t => {
        const li = document.createElement('li');
        li.setAttribute('data-term', t.term);
        const icon = document.createElement('i');
        icon.className = 'fas fa-chart-line';
        const span = document.createElement('span');
        span.textContent = t.display || t.term;
        const em = document.createElement('em');
        em.textContent = `${t.count} searches`;
        li.appendChild(icon);
        li.appendChild(span);
        li.appendChild(em);
        ul.appendChild(li);
    });
}

// 暴露到全局，方便 search.html / results.html 调用
if (typeof window !== 'undefined') {
    window.recordSearchTerm = recordSearchTerm;
    window.renderPopularListFromStorage = renderPopularListFromStorage;
}

// Function to initialize global search
function initGlobalSearch() {
    const searchBox = document.querySelector('.search-box');
    const searchIcon = document.querySelector('.search-icon');
    const isSearchPage = document.body.classList.contains('search-page');
    const isMobile = (typeof window !== 'undefined' && (
        window.matchMedia && window.matchMedia('(max-width: 768px)').matches
    )) || (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent));

    if (!searchBox) return;

    if (isSearchPage) {
        // 搜索页：不绑定首页的切换与实时搜索，改为点击按钮触发
        // 在 search.html 中，点击按钮与回车触发已单独绑定

        // 搜索页显示“Global”标识，仅作为状态提示
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.querySelector('.global-search-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'global-search-indicator active';
            indicator.textContent = 'Global';
            searchContainer.appendChild(indicator);
        }

        // 预加载全局数据，提升首次搜索速度；不显示任何加载提示
        if (isGlobalSearchActive && globalProducts.length === 0 && !isLoadingGlobalProducts) {
            loadAllProducts();
        }

        // 搜索页：根据本地记录渲染 Popular 列表
        renderPopularListFromStorage();
    } else {
        if (isMobile) {
            // 移动端首页：不弹出输入法，改为跳转到搜索页
            // 禁止弹出键盘（iOS/Android）
            try {
                searchBox.setAttribute('readonly', 'readonly');
                searchBox.setAttribute('inputmode', 'none');
                searchBox.setAttribute('aria-readonly', 'true');
            } catch (e) {}

            const navigateToSearch = (e) => {
                // 防止因默认行为产生的聚焦导致键盘闪现
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                window.location.href = 'search.html?autoFocus=1';
            };

            // 点击、触摸均跳转
            searchBox.addEventListener('click', navigateToSearch);
            searchBox.addEventListener('touchstart', navigateToSearch, { passive: true });
            if (searchIcon) {
                searchIcon.addEventListener('click', navigateToSearch);
            }
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.querySelector('.global-search-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'global-search-indicator active';
                indicator.textContent = 'Global';
                searchContainer.appendChild(indicator);
            }
        } else {
            // 桌面端首页：沿用旧版搜索（实时输入 + 图标切换全局/本地）
            if (searchIcon) {
                searchIcon.addEventListener('click', function() {
                    toggleGlobalSearch();
                });
            }
            searchBox.addEventListener('keyup', function() {
                const searchTerm = this.value.toLowerCase();
                if (isGlobalSearchActive) {
                    performGlobalSearch(searchTerm);
                } else {
                    performLocalSearch(searchTerm);
                }
            });
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.querySelector('.global-search-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'global-search-indicator active';
                indicator.textContent = 'Global';
                searchContainer.appendChild(indicator);
            }
            if (isGlobalSearchActive && globalProducts.length === 0 && !isLoadingGlobalProducts) {
                loadAllProducts();
            }
        }
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

    // 切换到全局搜索时，恢复无限滚动
    if (isGlobalSearchActive && typeof productRenderer !== 'undefined') {
        productRenderer.searchActive = false;
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

// Load products from all categories - 使用统一产品服务
function loadAllProducts() {
    isLoadingGlobalProducts = true;
    const productsContainer = document.getElementById('products-container');
    
    // 移除所有现有的全局加载指示器，确保只有一个
    const existingIndicators = document.querySelectorAll('.global-loading-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // 检查是否已经有其他加载指示器
    const otherLoadingIndicator = document.querySelector('.loading-indicator');
    
    // 仅在首页创建全局加载指示器；搜索页与结果页不显示“Loading all products...”
    if (!otherLoadingIndicator && !document.body.classList.contains('search-page') && !document.body.classList.contains('results-page') && productsContainer) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'global-loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading all products...';
        productsContainer.appendChild(loadingIndicator);
    }
    
    // Create promises for all category fetches
    const fetchPromises = getSearchCategories().map(category => {
        console.log(`Fetching category: ${category.name}, endpoint: ${category.endpoint}`);
        
        // 使用统一产品服务（如果可用）
        if (typeof productService !== 'undefined') {
            return productService.fetchProducts(category.endpoint)
                .then(data => {
                    return data.map(product => {
                        product.category = category.name;
                        product.categoryUrl = `${category.endpoint}.html`;
                        return product;
                    });
                })
                .catch(error => {
                    console.error(`Error fetching ${category.name}:`, error);
                    return [];
                });
        }
        
        // 后备方案：直接API调用 - 使用CONFIG
        const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.UTILS) 
            ? CONFIG.UTILS.getCategoryUrl(category.endpoint)
            : `https://opensheet.elk.sh/1hs4cXFLQRhdR8MfQ0vt0oMXhXplksGbU9vzkhO46J6A/${encodeURIComponent(category.endpoint)}`;
        return fetch(apiUrl)
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
                    .map(product => {
                        product.category = category.name;
                        product.categoryUrl = `${category.endpoint}.html`;
                        return product;
                    });
            })
            .catch(error => {
                console.error(`Error fetching ${category.name}:`, error);
                return []; // Return empty array on error
            });
    });
    
    // Wait for all fetches to complete
    return Promise.all(fetchPromises)
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
            if (typeof window !== 'undefined') {
                window.allProducts = globalProducts;
            }
            isLoadingGlobalProducts = false;
            
            // 只移除全局加载指示器，不影响其他加载指示器
            const globalLoadingIndicator = document.querySelector('.global-loading-indicator');
            if (globalLoadingIndicator) {
                globalLoadingIndicator.remove();
            }
            
            // If there's an active search term, perform search with loaded data
            const searchBox = document.querySelector('.search-box');
            const isSearchPage = document.body.classList.contains('search-page');
            const isResultsPage = document.body.classList.contains('results-page');
            // 首页（非搜索页/结果页）才自动渲染；搜索页仅预加载、结果页由自身脚本触发
            if (searchBox && searchBox.value.trim() !== '' && isGlobalSearchActive && !isSearchPage && !isResultsPage) {
                performGlobalSearch(searchBox.value.toLowerCase());
            }
        });
}

// Perform global search across all products
function performGlobalSearch(searchTerm) {
    // 搜索页不直接渲染结果，如被意外调用则改为跳转到结果页
    if (document.body.classList.contains('search-page')) {
        const term = (searchTerm || '').toLowerCase().trim();
        if (term) {
            window.location.href = `results.html?q=${encodeURIComponent(term)}`;
        }
        return;
    }
    // 搜索期间暂停分类的无限滚动，并取消在途加载
    if (typeof productRenderer !== 'undefined') {
        productRenderer.searchActive = true;
        if (typeof productRenderer.cancelLoad === 'function') {
            productRenderer.cancelLoad();
        }
    }

    if (globalProducts.length === 0) {
        if (!isLoadingGlobalProducts) {
            loadAllProducts();
        }
        return;
    }
    
    const productsContainer = document.getElementById('products-container');
    
    // Clear current products if we're showing search results
    if (searchTerm.trim() !== '') {
        // 保存原始内容（首次搜索）
        if (!productsContainer.hasAttribute('data-original-content')) {
            productsContainer.setAttribute('data-original-content', productsContainer.innerHTML);
        }

        // 清空容器并确保为统一的5列栅格
        productsContainer.innerHTML = '';
        productsContainer.classList.add('products-grid');

        // 过滤匹配的商品
        // 过滤匹配的商品
        const matchingProducts = globalProducts.filter(product =>
            product.spbt && product.spbt.toLowerCase().includes(searchTerm)
        );
        window.currentSearchResults = matchingProducts;

        // 使用统一产品渲染器的卡片结构，保证样式一致
        if (matchingProducts.length === 0) {
            productsContainer.innerHTML = `<div class="no-products">${(typeof CONFIG !== 'undefined' && CONFIG.ERROR_MESSAGES) ? CONFIG.ERROR_MESSAGES.NO_PRODUCTS : 'No products found'}</div>`;
        } else {
            matchingProducts.forEach((product, i) => {
                if (typeof productRenderer !== 'undefined' && typeof productRenderer.createProductCard === 'function') {
                    const card = productRenderer.createProductCard(product, i);
                    productsContainer.appendChild(card);
                } else {
                    // 后备：最简卡片结构
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.setAttribute('data-index', i);
                    card.innerHTML = `
                        <a href="#" onclick="event.preventDefault()">
                            <img src="${product.ztURL}" class="product-image" alt="${product.spbt}">
                            <div class="product-info">
                                <div class="product-title">${product.spbt}</div>
                                <div class="product-price">
                                    <span class="us-price">${product.US || '--'}</span>
                                    <span class="eur-price">${product.EUR || '--'}</span>
                                </div>
                            </div>
                        </a>`;
                    productsContainer.appendChild(card);
                }
            });
        }

        // 搜索页与结果页不需要“返回当前分类”按钮；仅在首页的本地搜索模式使用
        if (!document.body.classList.contains('search-page') && !document.body.classList.contains('results-page')) {
            const containerWrapper = document.querySelector('.container');
            if (containerWrapper && !document.getElementById('back-to-results-btn')) {
                const backButton = document.createElement('button');
                backButton.id = 'back-to-results-btn';
                backButton.className = 'back-to-results-btn';
                backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Current Category';
                backButton.addEventListener('click', function() {
                    const searchBox = document.querySelector('.search-box');
                    if (searchBox) searchBox.value = '';
                    if (productsContainer.hasAttribute('data-original-content')) {
                        productsContainer.innerHTML = productsContainer.getAttribute('data-original-content');
                        productsContainer.removeAttribute('data-original-content');
                    }
                    backButton.remove();
                });
                const anchorNode = containerWrapper.querySelector('#loading-indicator') || containerWrapper.firstChild;
                containerWrapper.insertBefore(backButton, anchorNode);
            }
        }
        
        // 滚动到顶部，便于查看搜索结果
        window.scrollTo(0, 0);
    } else {
        // If search is cleared, restore original content
        if (productsContainer.hasAttribute('data-original-content')) {
            productsContainer.innerHTML = productsContainer.getAttribute('data-original-content');
            productsContainer.removeAttribute('data-original-content');
        }
        if (typeof productRenderer !== 'undefined') {
            productRenderer.searchActive = false;
        }
        const backBtn = document.getElementById('back-to-results-btn');
        if (backBtn) backBtn.remove();
    }
}

// Perform local search (current page only)
function performLocalSearch(searchTerm) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;

    const term = (searchTerm || '').toLowerCase();
    const canUseRenderer = typeof productRenderer !== 'undefined' && Array.isArray(productRenderer.allProducts) && productRenderer.allProducts.length > 0;

    if (term.trim() !== '' && canUseRenderer) {
        productRenderer.searchActive = true;

        // 保存原始内容（首次搜索）
        if (!productsContainer.hasAttribute('data-original-content')) {
            productsContainer.setAttribute('data-original-content', productsContainer.innerHTML);
        }
        productsContainer.innerHTML = '';
        productsContainer.classList.add('products-grid');

        const matching = productRenderer.allProducts.filter(p => p.spbt && p.spbt.toLowerCase().includes(term));

        if (matching.length === 0) {
            productsContainer.innerHTML = `<div class="no-products">${(typeof CONFIG !== 'undefined' && CONFIG.ERROR_MESSAGES) ? CONFIG.ERROR_MESSAGES.NO_PRODUCTS : '没有找到商品'}</div>`;
        } else {
            matching.forEach((product, i) => {
                const card = (typeof productRenderer.createProductCard === 'function')
                    ? productRenderer.createProductCard(product, i)
                    : createFallbackCard(product);
                productsContainer.appendChild(card);
            });
        }

        // 添加“返回当前分类”按钮
        const containerWrapper = document.querySelector('.container');
        if (containerWrapper && !document.getElementById('back-to-results-btn')) {
            const backButton = document.createElement('button');
            backButton.id = 'back-to-results-btn';
            backButton.className = 'back-to-results-btn';
            backButton.innerHTML = '<i class="fas fa-arrow-left"></i> 返回当前分类';
            backButton.addEventListener('click', function() {
                const searchBox = document.querySelector('.search-box');
                if (searchBox) searchBox.value = '';
                if (productsContainer.hasAttribute('data-original-content')) {
                    productsContainer.innerHTML = productsContainer.getAttribute('data-original-content');
                    productsContainer.removeAttribute('data-original-content');
                }
                productRenderer.searchActive = false;
                backButton.remove();
            });
            const anchorNode = containerWrapper.querySelector('#loading-indicator') || containerWrapper.firstChild;
            containerWrapper.insertBefore(backButton, anchorNode);
        }

        window.scrollTo(0, 0);
    } else if (term.trim() === '' && canUseRenderer) {
        // 清空搜索时恢复
        productRenderer.searchActive = false;
        if (productsContainer.hasAttribute('data-original-content')) {
            productsContainer.innerHTML = productsContainer.getAttribute('data-original-content');
            productsContainer.removeAttribute('data-original-content');
        }
        const backBtn = document.getElementById('back-to-results-btn');
        if (backBtn) backBtn.remove();
    } else {
        // 后备方案：DOM级过滤（仅当前已渲染的卡片）
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const title = titleEl ? titleEl.textContent.toLowerCase() : '';
            card.style.display = title.includes(term) ? 'block' : 'none';
        });
    }

    function createFallbackCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <a href="${product.spURL}" target="_blank" rel="noopener noreferrer">
                <img src="${product.ztURL}" class="product-image" alt="${product.spbt}">
                <div class="product-info">
                    <div class="product-title">${product.spbt}</div>
                    <div class="product-price">
                        <span class="us-price">${product.US || '--'}</span>
                        <span class="eur-price">${product.EUR || '--'}</span>
                    </div>
                </div>
            </a>`;
        return card;
    }
}

// Initialize global search when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initGlobalSearch();
});