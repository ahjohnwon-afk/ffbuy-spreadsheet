// 统一的产品渲染器
class ProductRenderer {
    constructor() {
        this.allProducts = [];
        this.currentPage = 1;
        this.isLoading = false;
        this.allProductsLoaded = false;
        this.productsContainer = null;
        this.productsPerPage = 50;
        this.intersectionObserver = null;
        this.errorRetryCount = new Map(); // 错误重试计数
        this.maxRetries = 3;
        this.searchActive = false; // 本地搜索激活时禁用无限滚动
        this.boundHandleScroll = null; // 保存绑定的滚动处理器，便于移除
        this.activeLoadToken = 0; // 当前加载令牌，用于取消并发加载
    }

    // 初始化渲染器
    init(containerId = 'products-container') {
        this.productsContainer = document.getElementById(containerId);
        if (!this.productsContainer) {
            console.error(`Container with id '${containerId}' not found`);
            this.showUserFeedback('容器初始化失败，请刷新页面重试', 'error');
            return false;
        }
        
        // 初始化图片懒加载观察器
        this.initIntersectionObserver();
        
        // 统一管理滚动事件监听器，避免重复绑定
        if (this.boundHandleScroll) {
            window.removeEventListener('scroll', this.boundHandleScroll);
        }
        this.boundHandleScroll = this.handleScroll.bind(this);
        window.addEventListener('scroll', this.boundHandleScroll);
        return true;
    }

    // 初始化Intersection Observer用于图片懒加载
    initIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            this.loadImageWithRetry(img, src);
                            this.intersectionObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    // 带重试机制的图片加载
    loadImageWithRetry(img, src) {
        const retryKey = src;
        const currentRetries = this.errorRetryCount.get(retryKey) || 0;
        
        img.onload = () => {
            img.classList.add('loaded');
            this.errorRetryCount.delete(retryKey);
        };
        
        img.onerror = () => {
            if (currentRetries < this.maxRetries) {
                this.errorRetryCount.set(retryKey, currentRetries + 1);
                setTimeout(() => {
                    img.src = src;
                }, 1000 * (currentRetries + 1)); // 递增延迟重试
            } else {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+aXoOazleWKoOi9vTwvdGV4dD48L3N2Zz4=';
                img.classList.add('error');
                this.errorRetryCount.delete(retryKey);
            }
        };
        
        img.src = src;
    }

    // 加载并渲染产品
    async loadProducts(endpoint) {
        const token = ++this.activeLoadToken;
        
        // 重置状态
        this.reset();
        
        this.isLoading = true;
        this.showLoadingIndicator();
        
        try {
            const fetched = await productService.fetchProducts(endpoint);
            // 如果在请求期间切换了分类，则丢弃此次结果
            if (token !== this.activeLoadToken) {
                return;
            }
            this.allProducts = fetched;
            
            // 使产品数据全局可访问（用于产品详情功能）
            window.allProducts = this.allProducts;
            
            if (this.allProducts.length === 0) {
                this.showNoProductsMessage();
            } else {
                // 重置isLoading状态，以便loadMoreProducts可以执行
                this.isLoading = false;
                this.loadMoreProducts();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showErrorMessage(error.message);
            this.isLoading = false;
        } finally {
            // 仅在当前令牌有效时隐藏加载指示器，防止并发加载互相干扰
            if (token === this.activeLoadToken) {
                this.hideLoadingIndicator();
            }
        }
    }

    // 加载更多产品（分页）
    loadMoreProducts() {
        if (this.isLoading || this.allProductsLoaded || this.searchActive) return;
        
        this.isLoading = true;
        const token = this.activeLoadToken;
        
        const startIndex = (this.currentPage - 1) * CONFIG.PAGINATION.PRODUCTS_PER_PAGE;
        const endIndex = Math.min(startIndex + CONFIG.PAGINATION.PRODUCTS_PER_PAGE, this.allProducts.length);
        
        if (startIndex >= this.allProducts.length) {
            this.allProductsLoaded = true;
            this.isLoading = false;
            return;
        }
        
        // 显示加载更多指示器
        const loadingMoreIndicator = this.createLoadingMoreIndicator();
        this.productsContainer.appendChild(loadingMoreIndicator);
        
        // 模拟网络延迟（可在生产环境中移除）
        setTimeout(() => {
            // 如果在加载过程中切换了分类或进入搜索模式，则跳过
            if (token !== this.activeLoadToken || this.searchActive) {
                loadingMoreIndicator.remove();
                this.isLoading = false;
                return;
            }
            // 渲染当前页产品
            for (let i = startIndex; i < endIndex; i++) {
                const productCard = this.createProductCard(this.allProducts[i], i - startIndex);
                this.productsContainer.appendChild(productCard);
            }
            
            // 移除加载更多指示器
            loadingMoreIndicator.remove();
            
            this.currentPage++;
            
            // 检查是否所有产品都已加载
            if (endIndex >= this.allProducts.length) {
                this.allProductsLoaded = true;
                this.showEndMessage();
            }
            
            this.isLoading = false;
        }, 300);
    }

    // 创建产品卡片
    createProductCard(product, index = 0) {
        const sanitizedProduct = this.sanitizeProductData(product);
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-index', index);
        productCard.style.animationDelay = `${index * 0.1}s`;
        
        const link = document.createElement('a');
        link.href = sanitizedProduct.spURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        const img = document.createElement('img');
        img.className = 'product-image';
        img.alt = sanitizedProduct.spbt;
        // 提供固有尺寸以降低CLS，并启用异步解码
        img.setAttribute('width', '400');
        img.setAttribute('height', '500');
        img.decoding = 'async';
        
        // 使用Intersection Observer进行懒加载
        if (this.intersectionObserver) {
            img.dataset.src = sanitizedProduct.ztURL;
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOi9veS4rS4uLjwvdGV4dD48L3N2Zz4=';
            this.intersectionObserver.observe(img);
        } else {
            // 降级处理：直接加载图片
            img.loading = 'lazy';
            img.onerror = function() {
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+aXoOazleWKoOi9vTwvdGV4dD48L3N2Zz4=';
            };
            img.src = sanitizedProduct.ztURL;
        }
        
        const productInfo = document.createElement('div');
        productInfo.className = 'product-info';
        
        const title = document.createElement('div');
        title.className = 'product-title';
        title.textContent = sanitizedProduct.spbt;
        
        const price = document.createElement('div');
        price.className = 'product-price';
        
        const usPrice = document.createElement('span');
        usPrice.className = 'us-price';
        usPrice.textContent = sanitizedProduct.US;
        
        const eurPrice = document.createElement('span');
        eurPrice.className = 'eur-price';
        eurPrice.textContent = sanitizedProduct.EUR;
        
        price.appendChild(usPrice);
        price.appendChild(eurPrice);
        productInfo.appendChild(title);
        productInfo.appendChild(price);
        link.appendChild(img);
        link.appendChild(productInfo);
        productCard.appendChild(link);
        
        return productCard;
    }

    // 数据清理和安全处理
    sanitizeProductData(product) {
        return {
            spbt: this.escapeHtml(product.spbt || 'Product'),
            spURL: product.spURL || '#',
            ztURL: product.ztURL || 'img/placeholder.png',
            US: product.US || '--',
            EUR: product.EUR || '--'
        };
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示加载指示器
    showLoadingIndicator() {
        if (!this.productsContainer.querySelector('.loading-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'loading-indicator';
            indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading products...';
            this.productsContainer.appendChild(indicator);
        }
    }

    // 隐藏加载指示器
    hideLoadingIndicator() {
        const indicator = this.productsContainer.querySelector('.loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // 创建加载更多指示器
    createLoadingMoreIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'loading-more-indicator';
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading more products...';
        return indicator;
    }

    // 显示无产品消息
    showNoProductsMessage() {
        this.productsContainer.innerHTML = `<div class="no-products">${CONFIG.ERROR_MESSAGES.NO_PRODUCTS}</div>`;
        this.allProductsLoaded = true;
    }

    // 显示错误消息
    showErrorMessage(message) {
        this.productsContainer.innerHTML = `<div class="error-message">加载失败: ${this.escapeHtml(message)}<br><button onclick="location.reload()" class="retry-btn">重试</button></div>`;
        this.showUserFeedback('产品加载失败，请检查网络连接', 'error');
    }

    // 显示结束消息
    showEndMessage() {
        const endMessage = document.createElement('div');
        endMessage.className = 'end-message';
        endMessage.innerHTML = '<i class="fas fa-check-circle"></i> 所有产品已加载完成';
        this.productsContainer.appendChild(endMessage);
    }

    // 用户反馈机制
    showUserFeedback(message, type = 'info', duration = 3000) {
        // 移除现有的反馈消息
        const existingFeedback = document.querySelector('.user-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        const feedback = document.createElement('div');
        feedback.className = `user-feedback ${type}`;
        feedback.innerHTML = `
            <div class="feedback-content">
                <i class="fas ${this.getFeedbackIcon(type)}"></i>
                <span>${message}</span>
                <button class="feedback-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        // 添加样式
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            animation: slideInRight 0.3s ease-out;
        `;

        // 根据类型设置颜色
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };

        const color = colors[type] || colors.info;
        feedback.style.backgroundColor = color.bg;
        feedback.style.border = `1px solid ${color.border}`;
        feedback.style.color = color.text;

        document.body.appendChild(feedback);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => feedback.remove(), 300);
                }
            }, duration);
        }
    }

    getFeedbackIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // 取消当前加载（令牌自增，后续响应将被丢弃）
    cancelLoad() {
        this.activeLoadToken++;
        this.isLoading = false;
    }

    // 内存清理
    cleanup() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.boundHandleScroll) {
            window.removeEventListener('scroll', this.boundHandleScroll);
            this.boundHandleScroll = null;
        }
        this.errorRetryCount.clear();
    }

    // 处理滚动事件
    handleScroll() {
        if (this.isLoading || this.allProductsLoaded || this.searchActive) return;
        
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - CONFIG.PAGINATION.SCROLL_THRESHOLD) {
            this.loadMoreProducts();
        }
    }

    // 重置渲染器状态
    reset() {
        this.allProducts = [];
        this.currentPage = 1;
        this.isLoading = false;
        this.allProductsLoaded = false;
        this.searchActive = false;
        if (this.productsContainer) {
            this.productsContainer.innerHTML = '';
        }
    }
}

// 创建全局实例
const productRenderer = new ProductRenderer();

// 导出渲染器实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = productRenderer;
} else if (typeof window !== 'undefined') {
    window.productRenderer = productRenderer;
}