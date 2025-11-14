// 商品详情功能脚本

// 打开商品详情弹窗
function openProductDetail(productID, productUrl, productData) {
    const modal = document.getElementById('productDetailModal');
    const detailBody = document.getElementById('productDetailBody');
    const closeBtn = document.getElementById('closeDetailModal');
    
    window.__ffbuy_currentProduct = { id: productID || '', url: productUrl || '', title: (productData && productData.spbt) || '', category: (window.SPA && window.SPA.currentCategory) || '' };
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
    
    // 显示加载中
    detailBody.innerHTML = `
        <div class="product-detail-loading">
            <i class="fas fa-spinner fa-spin"></i> Loading product details...
        </div>
    `;
    
    // 关闭按钮事件
    closeBtn.onclick = function() {
        closeProductDetail();
    };
    
    // 点击弹窗外部关闭
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeProductDetail();
        }
    };
    
    // ESC键关闭弹窗
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeProductDetail();
        }
    });
    
    // 如果有商品ID，则获取详情
    if (productID) {
        fetchProductDetail(productID, productUrl, productData);
    } else {
        // 如果没有ID，显示基本信息
        showBasicProductDetail(productUrl, productData);
    }
}

// 关闭商品详情弹窗
function closeProductDetail() {
    const modal = document.getElementById('productDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = ''; // 恢复背景滚动
}

// 获取商品详情
function fetchProductDetail(productID, productUrl, productData) {
    const detailBody = document.getElementById('productDetailBody');
    
    // 检查商品ID是否有效
    if (!productID || productID.trim() === '') {
        console.warn('无效的商品ID，显示基本信息');
        showBasicProductDetail(productUrl, productData);
        return;
    }
    
    const apiUrl = `https://cnfans.com/search-api/detail/product-info?platform=WEIDIAN&productID=${productID}&forceReload=false&site=cnfans&lang=zh&wmc-currency=USD`;
    
    // 添加错误处理和超时
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000); // 10秒超时
    });
    
    Promise.race([fetch(apiUrl), timeoutPromise])
        .then(response => {
            if (!response.ok) {
                throw new Error(`获取商品详情失败: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 显示详细信息
            renderProductDetail(data, productUrl, productData);
        })
        .catch(error => {
            console.error('Error fetching product detail:', error);
            // 如果API请求失败，显示基本信息
            showBasicProductDetail(productUrl, productData);
        });
}

// 显示基本商品信息（当API请求失败时）
function showBasicProductDetail(productUrl, productData) {
    const detailBody = document.getElementById('productDetailBody');
    
    // 格式化价格显示，添加USD标签
    let priceDisplay = productData.US || '--';
    if (priceDisplay !== '--') {
        priceDisplay = priceDisplay.replace('USD', '<span class="price-currency">USD</span>');
    }
    
    detailBody.innerHTML = `
        <div class="product-detail-images">
            <img src="${productData.ztURL}" class="product-detail-main-image" alt="${productData.spbt}">
        </div>
        <div class="product-detail-info">
            <h3>${productData.spbt}</h3>
            <div class="product-detail-price">${priceDisplay}</div>
            <p class="product-detail-visit-text">Click to visit <span style="color: #2476db; font-weight: 600;">CNFANS</span> official ordering page</p>
              <div class="product-detail-actions">
                      <a href="${productUrl}" target="_blank" class="product-detail-buy-btn cnfans-btn" onclick="event.stopPropagation();">
                          <img src="img/cnfans.webp" alt="CNFANS" class="btn-icon">
                          <span>CNFANS</span>
                      </a>
                      <a href="${productData.loongbuy || ''}" target="_blank" class="product-detail-buy-btn loongbuy-btn" onclick="event.stopPropagation();">
                          <img src="img/loongbuy.webp" alt="loongbuy" class="btn-icon">
                          <span>loongbuy</span>
                      </a>
                      <a href="${productData.oopbuy || ''}" target="_blank" class="product-detail-buy-btn oopbuy-btn" onclick="event.stopPropagation();">
                          <img src="img/oopbuy.webp" alt="oopbuy" class="btn-icon">
                          <span>oopbuy</span>
                      </a>
                      <a href="${productData.allchinabuy || ''}" target="_blank" class="product-detail-buy-btn allchinabuy-btn" onclick="event.stopPropagation();">
                          <img src="img/allchinabuy.ico" alt="allchinabuy" class="btn-icon">
                          <span>allchinabuy</span>
                      </a>
                      <a href="${productData.mulebuy || ''}" target="_blank" class="product-detail-buy-btn mulebuy-btn" onclick="event.stopPropagation();">
                          <img src="img/mulebuy.webp" alt="mulebuy" class="btn-icon">
                          <span>mulebuy</span>
                      </a>
                      <a href="${productData.kakobuy || ''}" target="_blank" class="product-detail-buy-btn kakobuy-btn" onclick="event.stopPropagation();">
                          <img src="img/kakobuy.webp" alt="kakobuy" class="btn-icon">
                          <span>kakobuy</span>
                      </a>
                  </div>
        </div>
    `;
    const agentBtns1 = detailBody.querySelectorAll('.product-detail-buy-btn');
    agentBtns1.forEach(function(btn){
        btn.addEventListener('click', function(e){
            var href = this.getAttribute('href') || '';
            e.preventDefault();
            e.stopPropagation();
            var name = this.classList.contains('cnfans-btn') ? 'CNFANS' : this.classList.contains('loongbuy-btn') ? 'loongbuy' : this.classList.contains('oopbuy-btn') ? 'oopbuy' : this.classList.contains('allchinabuy-btn') ? 'allchinabuy' : this.classList.contains('mulebuy-btn') ? 'mulebuy' : this.classList.contains('kakobuy-btn') ? 'kakobuy' : (this.textContent || '').trim();
            var ctx = window.__ffbuy_currentProduct || {};
            if (typeof gtag === 'function') {
                gtag('event', 'agent_click', { agent_name: name, product_id: ctx.id || '', product_title: (ctx.title || (productData && productData.spbt) || ''), product_url: (ctx.url || productUrl || ''), category: (ctx.category || (window.SPA && window.SPA.currentCategory) || ''), event_callback: function(){ try { if (href) window.open(href, '_blank'); } catch (err) { if (href) location.href = href; } } });
            } else {
                if (href) window.open(href, '_blank');
            }
        });
    });
}

// 渲染商品详情
function renderProductDetail(detailData, productUrl, productData) {
    const detailBody = document.getElementById('productDetailBody');
    
    // 如果API返回了错误或没有数据
    if (!detailData || !detailData.data) {
        showBasicProductDetail(productUrl, productData);
        return;
    }
    
    const data = detailData.data;
    
    // 准备图片
    let imagesHtml = '';
    let thumbnailsHtml = '';
    
    // 使用API返回的productImgList字段或备用图片
    let images = [];
    
    // 按照优先级检查各种可能的图片来源
    if (data.productImgList && data.productImgList.length > 0) {
        // 首先检查直接的productImgList字段
        images = data.productImgList;
    }
    else if (data.productDetail && data.productDetail.productImgList && data.productDetail.productImgList.length > 0) {
        // 然后检查productDetail.productImgList字段
        images = data.productDetail.productImgList;
    }
    else if (data.images && data.images.length > 0) {
        // 再检查images字段
        images = data.images;
    }
    else {
        // 如果都没有，使用商品卡片的图片
        images = [productData.ztURL];
    }
    
    // 生成主图和缩略图HTML
    if (images && images.length > 0) {
        imagesHtml = `<img src="${images[0]}" class="product-detail-main-image" alt="${productData.spbt}" id="mainDetailImage">`;
        
        // 生成缩略图 - 支持横向滚动
        if (images.length > 1) {
            thumbnailsHtml = '<div class="product-detail-thumbnails-wrapper">';
            // 添加左右滑动指示器
            if (images.length > 4) {
                thumbnailsHtml += '<div class="thumbnail-scroll-indicator left"><i class="fas fa-chevron-left"></i></div>';
            }
            
            thumbnailsHtml += '<div class="product-detail-thumbnails">';
            images.forEach((img, index) => {
                thumbnailsHtml += `<img src="${img}" class="product-detail-thumbnail ${index === 0 ? 'active' : ''}" alt="Thumbnail ${index + 1}">`;
            });
            thumbnailsHtml += '</div>';
            
            // 添加右侧滑动指示器
            if (images.length > 4) {
                thumbnailsHtml += '<div class="thumbnail-scroll-indicator right"><i class="fas fa-chevron-right"></i></div>';
            }
            
            thumbnailsHtml += '</div>';
        }
    } else {
        // 如果没有图片，使用默认图片
        imagesHtml = `<img src="${productData.ztURL}" class="product-detail-main-image" alt="${productData.spbt}">`;
    }
    
    // 准备属性
    let attributesHtml = '';
    if (data.attributes && data.attributes.length > 0) {
        attributesHtml = '<div class="product-detail-attributes">';
        data.attributes.forEach(attr => {
            attributesHtml += `
                <div class="product-detail-attribute">
                    <div class="attribute-name">${attr.name}:</div>
                    <div class="attribute-value">${attr.value}</div>
                </div>
            `;
        });
        attributesHtml += '</div>';
    }
    
    // 格式化价格显示，添加USD标签
    let priceDisplay = data.price || productData.US || '--';
    if (priceDisplay !== '--') {
        priceDisplay = priceDisplay.replace('USD', '<span class="price-currency">USD</span>');
    }
    
    // 渲染详情
    detailBody.innerHTML = `
        <div class="product-detail-images">
            ${imagesHtml}
            ${thumbnailsHtml}
        </div>
        <div class="product-detail-info">
            <h3>${data.title || productData.spbt}</h3>
            <div class="product-detail-price">${priceDisplay}</div>
            ${attributesHtml}
            <p class="product-detail-visit-text"><span style="color: #2476db; font-weight: 600;">Select the agent</span> you want to buy on</p>
            <div class="product-detail-actions">
                  <a href="${productUrl}" target="_blank" class="product-detail-buy-btn cnfans-btn" onclick="event.stopPropagation();">
                      <img src="img/cnfans.webp" alt="CNFANS" class="btn-icon">
                      <span>CNFANS</span>
                  </a>
                  <a href="${productData.loongbuy || ''}" target="_blank" class="product-detail-buy-btn loongbuy-btn" onclick="event.stopPropagation();">
                      <img src="img/loongbuy.webp" alt="loongbuy" class="btn-icon">
                      <span>loongbuy</span>
                  </a>
                  <a href="${productData.oopbuy || ''}" target="_blank" class="product-detail-buy-btn oopbuy-btn" onclick="event.stopPropagation();">
                      <img src="img/oopbuy.webp" alt="oopbuy" class="btn-icon">
                      <span>oopbuy</span>
                  </a>
                  <a href="${productData.allchinabuy || ''}" target="_blank" class="product-detail-buy-btn allchinabuy-btn" onclick="event.stopPropagation();">
                      <img src="img/allchinabuy.ico" alt="allchinabuy" class="btn-icon">
                      <span>allchinabuy</span>
                  </a>
                  <a href="${productData.mulebuy || ''}" target="_blank" class="product-detail-buy-btn mulebuy-btn" onclick="event.stopPropagation();">
                      <img src="img/mulebuy.webp" alt="mulebuy" class="btn-icon">
                      <span>mulebuy</span>
                  </a>
                  <a href="${productData.kakobuy || ''}" target="_blank" class="product-detail-buy-btn kakobuy-btn" onclick="event.stopPropagation();">
                      <img src="img/kakobuy.webp" alt="kakobuy" class="btn-icon">
                      <span>kakobuy</span>
                  </a>
              </div>
        </div>
    `;
    
    var agentBtns2 = detailBody.querySelectorAll('.product-detail-buy-btn');
    agentBtns2.forEach(function(btn){
        btn.addEventListener('click', function(e){
            var href = this.getAttribute('href') || '';
            e.preventDefault();
            e.stopPropagation();
            var name = this.classList.contains('cnfans-btn') ? 'CNFANS' : this.classList.contains('loongbuy-btn') ? 'loongbuy' : this.classList.contains('oopbuy-btn') ? 'oopbuy' : this.classList.contains('allchinabuy-btn') ? 'allchinabuy' : this.classList.contains('mulebuy-btn') ? 'mulebuy' : this.classList.contains('kakobuy-btn') ? 'kakobuy' : (this.textContent || '').trim();
            var ctx = window.__ffbuy_currentProduct || {};
            if (typeof gtag === 'function') {
                gtag('event', 'agent_click', { agent_name: name, product_id: ctx.id || '', product_title: (ctx.title || (productData && productData.spbt) || ''), product_url: (ctx.url || productUrl || ''), category: (ctx.category || (window.SPA && window.SPA.currentCategory) || ''), event_callback: function(){ try { if (href) window.open(href, '_blank'); } catch (err) { if (href) location.href = href; } } });
            } else {
                if (href) window.open(href, '_blank');
            }
        });
    });
    const thumbnails = detailBody.querySelectorAll('.product-detail-thumbnail');
    const mainImage = document.getElementById('mainDetailImage');
    const thumbnailsContainer = detailBody.querySelector('.product-detail-thumbnails');
    const leftIndicator = detailBody.querySelector('.thumbnail-scroll-indicator.left');
    const rightIndicator = detailBody.querySelector('.thumbnail-scroll-indicator.right');
    
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', function() {
                // 更新主图
                mainImage.src = images[index];
                
                // 更新缩略图激活状态
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                
                // 滚动缩略图到可视区域
                if (thumbnailsContainer) {
                    // 计算滚动位置，使选中的缩略图居中显示
                    const containerWidth = thumbnailsContainer.offsetWidth;
                    const thumbWidth = thumb.offsetWidth;
                    const scrollLeft = thumb.offsetLeft - (containerWidth / 2) + (thumbWidth / 2);
                    
                    // 平滑滚动到计算的位置
                    thumbnailsContainer.scrollTo({
                        left: scrollLeft,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // 添加左右滑动指示器点击事件
        if (leftIndicator && thumbnailsContainer) {
            leftIndicator.addEventListener('click', function() {
                // 向左滚动一个视口宽度的80%
                const scrollAmount = thumbnailsContainer.offsetWidth * 0.8;
                thumbnailsContainer.scrollBy({
                    left: -scrollAmount,
                    behavior: 'smooth'
                });
            });
        }
        
        if (rightIndicator && thumbnailsContainer) {
            rightIndicator.addEventListener('click', function() {
                // 向右滚动一个视口宽度的80%
                const scrollAmount = thumbnailsContainer.offsetWidth * 0.8;
                thumbnailsContainer.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            });
        }
    }
}

// 在页面加载完成后，为所有商品卡片添加点击事件
document.addEventListener('DOMContentLoaded', function() {
    // 确保商品详情弹窗存在
    if (!document.getElementById('productDetailModal')) {
        console.error('商品详情弹窗不存在，请检查HTML结构');
        return;
    }
    
    // 监听商品卡片创建事件
    const productsContainer = document.getElementById('products-container');
    if (productsContainer) {
        // 使用MutationObserver监听DOM变化，为新添加的商品卡片绑定点击事件
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.classList.contains('product-card')) {
                            // 为新添加的商品卡片绑定点击事件
                            bindProductCardClickEvent(node);
                        }
                    });
                }
            });
        });
        
        // 配置观察选项
        const config = { childList: true, subtree: true };
        
        // 开始观察
        observer.observe(productsContainer, config);

        productsContainer.addEventListener('click', function(e){
            var card = e.target.closest('.product-card');
            if (!card) return;
            var isBuy = e.target.closest('.product-detail-buy-btn');
            if (isBuy) return;
            var linkEl = card.querySelector('a');
            if (linkEl) { e.preventDefault(); e.stopPropagation(); }
            if (!card.dataset.hasClickEvent) { bindProductCardClickEvent(card); }
            var pid = card.dataset.productId || '';
            var purl = card.dataset.productUrl || (linkEl ? linkEl.href : '');
            var titleEl = card.querySelector('.product-title');
            var imageEl = card.querySelector('.product-image');
            var priceEl = card.querySelector('.us-price');
            var data = { spbt: titleEl ? titleEl.textContent : '', ztURL: imageEl ? imageEl.src : '', US: priceEl ? priceEl.textContent : '' };
            if (window.allProducts && Array.isArray(window.allProducts) && data.spbt) {
                var full = window.allProducts.find(function(p){ return p.spbt === data.spbt; });
                if (full) {
                    if (full.loongbuy) data.loongbuy = full.loongbuy;
                    if (full.oopbuy) data.oopbuy = full.oopbuy;
                    if (full.allchinabuy) data.allchinabuy = full.allchinabuy;
                    if (full.mulebuy) data.mulebuy = full.mulebuy;
                    if (full.kakobuy) data.kakobuy = full.kakobuy;
                }
            }
            if (typeof window.gtag === 'function') {
                window.gtag('event', 'product_click', { product_id: pid, product_title: data.spbt, product_url: purl, category: (window.SPA && window.SPA.currentCategory) || '' });
            }
            openProductDetail(pid, purl, data);
        });
    }
});

// 为商品卡片绑定点击事件
function bindProductCardClickEvent(productCard) {
    // 检查是否已经有点击事件
    if (productCard.dataset.hasClickEvent) {
        return;
    }
    
    // 从数据属性中获取商品ID和URL
    let productID = productCard.dataset.productId || '';
    let productUrl = productCard.dataset.productUrl || '';
    
    // 如果数据属性中没有商品ID和URL，尝试从<a>标签中获取
    if (!productUrl) {
        const linkElement = productCard.querySelector('a');
        if (linkElement) {
            productUrl = linkElement.href;
            
            // 如果没有商品ID，尝试从URL中提取
            if (!productID) {
                try {
                    const url = new URL(productUrl);
                    const pathParts = url.pathname.split('/');
                    
                    // 尝试从URL路径中提取商品ID
                    for (let i = 0; i < pathParts.length; i++) {
                        if (pathParts[i] && !isNaN(pathParts[i])) {
                            productID = pathParts[i];
                            break;
                        }
                    }
                    
                    // 如果路径中没找到，尝试从查询参数中提取
                    if (!productID) {
                        productID = url.searchParams.get('itemID') || 
                                url.searchParams.get('id') || 
                                url.searchParams.get('productID') || '';
                    }
                } catch (e) {
                    console.error('Error extracting product ID:', e);
                }
            }
        }
    }
    
    // 获取商品数据
    const titleElement = productCard.querySelector('.product-title');
    const imageElement = productCard.querySelector('.product-image');
    const priceElement = productCard.querySelector('.us-price');
    
    // 创建基本的productData对象
    const productData = {
        spbt: titleElement ? titleElement.textContent : '',
        ztURL: imageElement ? imageElement.src : '',
        US: priceElement ? priceElement.textContent : ''
    };
    
    // 尝试从全局allProducts数组中查找完整的产品数据
    if (window.allProducts && Array.isArray(window.allProducts) && productData.spbt) {
        // 通过标题匹配查找完整产品数据
        const fullProductData = window.allProducts.find(p => p.spbt === productData.spbt);
        if (fullProductData) {
            // 添加所有购买平台的URL
            if (fullProductData.loongbuy) productData.loongbuy = fullProductData.loongbuy;
            if (fullProductData.oopbuy) productData.oopbuy = fullProductData.oopbuy;
            if (fullProductData.allchinabuy) productData.allchinabuy = fullProductData.allchinabuy;
            if (fullProductData.mulebuy) productData.mulebuy = fullProductData.mulebuy;
            if (fullProductData.kakobuy) productData.kakobuy = fullProductData.kakobuy;
        }
    }
    
    // 存储商品ID和URL到数据属性
    productCard.dataset.productId = productID;
    productCard.dataset.productUrl = productUrl;
    productCard.dataset.hasClickEvent = 'true';
    
    // 为商品卡片添加点击事件
    productCard.addEventListener('click', function(event) {
        // 如果点击的是链接元素，但不是购买按钮，阻止默认行为
        const clickedElement = event.target.tagName === 'A' ? event.target : event.target.closest('a');
        if (clickedElement && !clickedElement.classList.contains('product-detail-buy-btn')) {
            event.preventDefault();
        }
        var pid = productCard.dataset.productId || '';
        var purl = productCard.dataset.productUrl || '';
        if (typeof gtag === 'function') {
            gtag('event', 'product_click', { product_id: pid, product_title: productData.spbt, product_url: purl, category: (window.SPA && window.SPA.currentCategory) || '' });
        }
        openProductDetail(this.dataset.productId, this.dataset.productUrl, productData);
    });
    
    // 如果有链接元素，但不是购买按钮，阻止其默认行为
    const linkElements = productCard.querySelectorAll('a:not(.product-detail-buy-btn)');
    if (linkElements.length > 0) {
        linkElements.forEach(linkElement => {
            linkElement.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                openProductDetail(productCard.dataset.productId, productCard.dataset.productUrl, productData);
            });
        });
    }
}