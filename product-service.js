// 统一的产品服务模块
class ProductService {
    constructor() {
        this.cache = new Map();
        this.isLoading = false;
        this.retryCount = 0;
    }

    // 获取产品数据（带缓存和重试机制）
    async fetchProducts(endpoint) {
        if (String(endpoint).toLowerCase() === 'hot') {
            return this.fetchHotProductsByStats();
        }

        const cacheKey = endpoint;
        
        // 检查缓存
        if (CONFIG.CACHE.ENABLED && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE.EXPIRY_TIME) {
                console.log(`Using cached data for ${endpoint}`);
                return cached.data;
            }
        }

        // 构建API URL - 使用配置中的工具函数
        const apiUrl = (CONFIG.UTILS && CONFIG.UTILS.getCategoryUrl) 
            ? CONFIG.UTILS.getCategoryUrl(endpoint)
            : `${CONFIG.API.BASE_URL}/${encodeURIComponent(endpoint)}`;
        
        try {
            const data = await this.fetchWithRetry(apiUrl);
            
            // 过滤有效产品
            const validProducts = data.filter(product => 
                product.spbt && product.ztURL && product.spURL
            );
            
            // 缓存数据
            if (CONFIG.CACHE.ENABLED) {
                this.updateCache(cacheKey, validProducts);
            }
            
            return validProducts;
        } catch (error) {
            console.error(`Error fetching products for ${endpoint}:`, error);
            throw this.handleError(error);
        }
    }

    async fetchHotProductsByStats() {
        const cacheKey = '__hot_stats_products__';
        if (CONFIG.CACHE.ENABLED && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE.EXPIRY_TIME) {
                console.log('Using cached Hot products by stats');
                return cached.data;
            }
        }

        try {
            const statsUrl = this.getFieldStatsUrl({
                event: 'agent_click',
                field: 'product_id',
                unique: 'false',
                days: '7',
                site_id: 'ffbuy'
            });
            const statsResp = await this.fetchWithRetry(statsUrl);
            const statsList = Array.isArray(statsResp?.data) ? statsResp.data : [];
            const idToClicks = new Map();
            statsList.forEach(item => {
                const id = String(item?.name || '').trim();
                const val = Number(item?.value || 0);
                if (id) idToClicks.set(id, val);
            });

            const endpoints = (CONFIG.categories || []).map(c => c.endpoint).filter(ep => String(ep).toLowerCase() !== 'hot');
            const fetchPromises = endpoints.map(ep => this.fetchProducts(ep).catch(() => []));
            const allArrays = await Promise.all(fetchPromises);
            const combined = allArrays.flat();

            const grouped = new Map();
            for (const p of combined) {
                const pid = this.extractProductId(p);
                if (pid && idToClicks.has(pid)) {
                    const arr = grouped.get(pid);
                    if (arr) arr.push(p); else grouped.set(pid, [p]);
                }
            }
            const selected = [];
            for (const [pid, arr] of grouped.entries()) {
                if (arr.length > 0) {
                    const clicks = idToClicks.get(pid) || 0;
                    const idx = Math.floor(Math.random() * arr.length);
                    const chosen = { ...arr[idx], hotClicks: clicks };
                    selected.push(chosen);
                }
            }

            const selectedSorted = selected.sort((a, b) => (b.hotClicks || 0) - (a.hotClicks || 0));
            const selectedUrls = new Set(selectedSorted.map(p => p.spURL).filter(Boolean));
            const appendPool = [];
            for (const p of combined) {
                if (!p || !p.spURL) continue;
                if (selectedUrls.has(p.spURL)) continue;
                const pid2 = this.extractProductId(p);
                if (pid2 && idToClicks.has(pid2)) continue;
                appendPool.push(p);
            }
            for (let i = appendPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = appendPool[i];
                appendPool[i] = appendPool[j];
                appendPool[j] = tmp;
            }
            let result = selectedSorted.concat(appendPool);
            if (result.length === 0) {
                console.warn('No products matched field_stats IDs, falling back to Hot sheet');
                result = await this.fetchCategoryRaw('Hot');
            }

            if (CONFIG.CACHE.ENABLED) {
                this.updateCache(cacheKey, result);
            }

            return result;
        } catch (err) {
            console.error('Error building Hot products by stats:', err);
            try {
                return await this.fetchCategoryRaw('Hot');
            } catch (e) {
                throw this.handleError(err);
            }
        }
    }

    getFieldStatsUrl(params) {
        const base = (CONFIG.POPULAR && CONFIG.POPULAR.BASE_URL) ? CONFIG.POPULAR.BASE_URL : 'https://webga4.lu10221.workers.dev';
        const qs = new URLSearchParams(params).toString();
        return `${base}/api/field_stats?${qs}`;
    }

    extractProductId(product) {
        const raw = product?.ID || product?.Id || product?.id || '';
        if (raw && String(raw).trim()) {
            return String(raw).trim();
        }
        const urlStr = product?.spURL || '';
        if (!urlStr) return '';
        try {
            const u = new URL(urlStr);
            const cand = u.searchParams.get('itemID') || u.searchParams.get('id') || u.searchParams.get('productID');
            if (cand && /^\d+$/.test(cand)) return cand;
            const parts = u.pathname.split('/').filter(Boolean);
            for (let i = parts.length - 1; i >= 0; i--) {
                const seg = parts[i];
                if (/^\d{6,}$/.test(seg)) return seg;
            }
        } catch (_) {
            const m = String(urlStr).match(/(\d{6,})/);
            if (m) return m[1];
        }
        return '';
    }

    async fetchCategoryRaw(endpoint) {
        const apiUrl = (CONFIG.UTILS && CONFIG.UTILS.getCategoryUrl) 
            ? CONFIG.UTILS.getCategoryUrl(endpoint)
            : `${CONFIG.API.BASE_URL}/${encodeURIComponent(endpoint)}`;
        const data = await this.fetchWithRetry(apiUrl);
        const validProducts = data.filter(product => 
            product.spbt && product.ztURL && product.spURL
        );
        return validProducts;
    }

    // 带重试机制的fetch
    async fetchWithRetry(url, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);
            
            const response = await fetch(url, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (retryCount < CONFIG.API.RETRY_COUNT) {
                console.log(`Retrying request (${retryCount + 1}/${CONFIG.API.RETRY_COUNT})...`);
                await this.delay(CONFIG.API.RETRY_DELAY * (retryCount + 1));
                return this.fetchWithRetry(url, retryCount + 1);
            }
            throw error;
        }
    }

    // 错误处理
    handleError(error) {
        if (error.name === 'AbortError') {
            return new Error(CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR);
        }
        if (error.message.includes('Failed to fetch')) {
            return new Error(CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
        }
        return new Error(CONFIG.ERROR_MESSAGES.LOADING_ERROR);
    }

    // 更新缓存
    updateCache(key, data) {
        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= CONFIG.CACHE.MAX_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
    }

    // 获取缓存状态
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 创建全局实例
const productService = new ProductService();

// 导出服务实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = productService;
} else if (typeof window !== 'undefined') {
    window.productService = productService;
}
