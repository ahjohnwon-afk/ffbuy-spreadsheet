// 项目配置文件 - 集中管理所有API和分类配置
const CONFIG = {
    // 站点基本信息
    SITE: {
        NAME: '$FFBuy SpreadSheet',
        LOGO_TEXT: '$FFBuy SpreadSheet',
        DEFAULT_CATEGORY: 'Shoes', // 默认跳转的分类
        // 获取默认分类对象
        get defaultCategory() {
            return CONFIG.categories.find(c => c.name === this.DEFAULT_CATEGORY);
        }
    },

    // API工具函数
    UTILS: {
        // 生成分类API URL
        getCategoryUrl: function(endpoint) {
            return `${CONFIG.API.BASE_URL}/${encodeURIComponent(endpoint)}`;
        },
        
        // 根据分类名获取分类对象
        getCategoryByName: function(name) {
            return CONFIG.categories.find(c => c.name === name);
        }
    },
    
    // API配置
    API: {
        BASE_URL: 'https://opensheet.elk.sh/1GEMNqUmGYTSH4oEpcqbIQYWQfihefyB0GeeANSxsucw',
        TIMEOUT: 10000, // 10秒超时
        RETRY_COUNT: 3, // 重试次数
        RETRY_DELAY: 1000 // 重试延迟(毫秒)
    },

    // 全站热搜后端（Cloudflare Workers）配置
    POPULAR: {
        // 设置为你的 Workers 公开地址，例如：
        // 'https://ffbuy-popular.<your-subdomain>.workers.dev'
        // 或自定义域名：'https://popular.91link.top'
        BASE_URL: 'https://ffbuy-popular.lu10221.workers.dev'
    },
    
    // 分页配置
    PAGINATION: {
        PRODUCTS_PER_PAGE: 20,
        SCROLL_THRESHOLD: 200 // 距离底部多少像素时触发加载
    },
    
    // 缓存配置
    CACHE: {
        ENABLED: true,
        EXPIRY_TIME: 5 * 60 * 1000, // 5分钟缓存过期
        MAX_SIZE: 50 // 最大缓存条目数
    },
    
    // 错误消息
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network connection failed, please check your internet connection',
        TIMEOUT_ERROR: 'Request timeout, please try again later',
        NO_PRODUCTS: 'No products available at the moment',
        LOADING_ERROR: 'Failed to load products, please refresh the page'
    },
    
    // Google Analytics配置
    ANALYTICS: {
        TRACKING_ID: 'G-DZ3110PTYG'
    },
    
    // 支付方式配置
    PAYMENT_METHODS: [
        { name: 'PayPal', logo: 'img/PayPal.svg', alt: 'PayPal' },
        { name: 'Visa', logo: 'img/Visa_Logo.png', alt: 'Visa' },
        { name: 'Mastercard', logo: 'img/Mastercard-logo.png', alt: 'Mastercard' },
        { name: 'COD', logo: 'img/cod.png', alt: 'Cash on Delivery' }
    ],
    
    // 分类配置 - 统一管理所有分类信息 (SPA架构)
    categories: [
        { 
            name: 'Shirts', 
            endpoint: 'Shirts', 
            icon: 'fas fa-tshirt',
            displayName: 'Shirts'
        },
        { 
            name: 'Pants', 
            endpoint: 'Pants', 
            icon: 'fas fa-socks',
            displayName: 'Pants'
        },
        { 
            name: 'Shoes', 
            endpoint: 'Shoes', 
            icon: 'fas fa-shoe-prints',
            displayName: 'Shoes'
        },
        { 
            name: 'Hoodies.Sweatshirts', 
            endpoint: 'Hoodies.Sweatshirts', 
            icon: 'fas fa-tshirt',
            displayName: 'Hoodies/Sweatshirts'
        },
        { 
            name: 'Coats.Outerwear', 
            endpoint: 'Coats.Outerwear', 
            icon: 'fas fa-user-tie',
            displayName: 'Coats/Outerwear'
        },
        { 
            name: 'Set', 
            endpoint: 'Set', 
            icon: 'fas fa-layer-group',
            displayName: 'Set'
        },
        { 
            name: 'Accessories', 
            endpoint: 'Accessories', 
            icon: 'fas fa-gem',
            displayName: 'Accessories'
        },
        { 
            name: 'Electronics', 
            endpoint: 'Electronics', 
            icon: 'fas fa-laptop',
            displayName: 'Electronics'
        },
        { 
            name: 'Perfumes', 
            endpoint: 'Perfumes', 
            icon: 'fas fa-spray-can',
            displayName: 'Perfumes'
        },
        { 
            name: 'Toys', 
            endpoint: 'Toys', 
            icon: 'fas fa-puzzle-piece',
            displayName: 'Toys'
        }
    ],
    
    // 信任信息配置
    TRUST_INFO: {
        PLATFORM_NAME: 'CNFANS Platform',
        PLATFORM_COLOR: '#2476db',
        SECURITY_MESSAGE: 'This page displays products only. Orders are securely processed via <strong style="color:#2476db; font-weight:600;">CNFANS Platform</strong> with buyer protection & after-sales support.',
        PAYMENT_MESSAGE: '<strong>Secure payments</strong> supported by'
    }
};

// 导出配置（兼容不同的模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
