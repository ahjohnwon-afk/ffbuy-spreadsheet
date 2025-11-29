// 商品详情功能脚本
function gaSendEvent(name, params) {
    try {
        var p = params || {};
        var u = new URLSearchParams(window.location.search);
        if (u.get('ga_debug') === '1') {
            p = Object.assign({ debug_mode: true }, p);
        }
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, p);
            return true;
        }
    } catch (e) {}
    return false;
}

function getCid() {
    try {
        var k = '__cid';
        var cid = localStorage.getItem(k);
        if (!cid) {
            cid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random());
            localStorage.setItem(k, cid);
        }
        return cid;
    } catch (e) { return Date.now() + '-' + Math.random(); }
}

function cfReport(event, payload) {
    try {
        var endpoint = (window.CONFIG && CONFIG.ANALYTICS && CONFIG.ANALYTICS.CF_ENDPOINT) || 'https://ga4.lu10221.workers.dev/collect';
        var data = Object.assign({ event: event, ts: Date.now(), cid: getCid(), page: location.pathname, ref: document.referrer || '', ua: navigator.userAgent }, payload || {});
        var json = JSON.stringify(data);
        var blob = new Blob([json], { type: 'text/plain' });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(endpoint, blob);
        } else {
            var isFile = (location && location.protocol === 'file:');
            fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: json, keepalive: true, mode: isFile ? 'no-cors' : 'cors' }).catch(function(){});
        }
    } catch (e) {}
}

function reportEvent(name, params) {
    var ok = gaSendEvent(name, params);
    cfReport(name, params);
    return ok;
}

// 打开商品详情弹窗
function openProductDetail(productID, productUrl, productData) {
    const modal = document.getElementById('productDetailModal');
    const detailBody = document.getElementById('productDetailBody');
    const closeBtn = document.getElementById('closeDetailModal');
    
    window.__ffbuy_currentProduct = { id: productID || '', url: productUrl || '', title: (productData && productData.spbt) || '', category: (window.SPA && window.SPA.currentCategory) || '' };
    modal.style.display = 'block';
    setTimeout(function(){ modal.classList.add('open'); }, 0);
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

    // 移动端下拉关闭（Bottom Sheet 手势）
    (function(){
        var sheet = modal.querySelector('.product-detail-content');
        var bodyEl = modal.querySelector('.product-detail-body');
        if (!sheet) return;
        var startY = 0, pulled = 0, dragging = false, startScrollTop = 0, startTime = 0;
        var minToClosePx = Math.min(window.innerHeight * 0.25, 220);
        function onStart(e){
            if (!e.touches || e.touches.length !== 1) return;
            startY = e.touches[0].clientY;
            startScrollTop = bodyEl ? bodyEl.scrollTop : 0;
            pulled = 0; dragging = false; startTime = Date.now();
        }
        function onMove(e){
            if (!e.touches || e.touches.length !== 1) return;
            var dy = e.touches[0].clientY - startY;
            if (dy <= 0) return;
            if (!dragging) {
                if (startScrollTop > 0) return;
                dragging = true;
                sheet.classList.add('dragging');
            }
            pulled = dy;
            e.preventDefault();
            sheet.style.transform = 'translateY(' + dy + 'px)';
            var ratio = Math.max(0, Math.min(1, dy / (window.innerHeight * 0.8)));
            modal.style.opacity = String(1 - 0.8 * ratio);
        }
        function onEnd(){
            if (!dragging) return;
            sheet.classList.remove('dragging');
            var quick = (Date.now() - startTime) < 180 && pulled > 80;
            var shouldClose = quick || pulled > minToClosePx;
            if (shouldClose) {
                closeProductDetail();
            } else {
                sheet.style.transition = 'transform 0.2s ease';
                sheet.style.transform = 'translateY(0)';
                setTimeout(function(){ sheet.style.transition = ''; }, 220);
                modal.style.opacity = '';
            }
            dragging = false;
        }
        sheet.addEventListener('touchstart', onStart, { passive: true });
        sheet.addEventListener('touchmove', onMove, { passive: false });
        sheet.addEventListener('touchend', onEnd, { passive: true });
        modal.__sheetHandlers = { sheet: sheet, onStart: onStart, onMove: onMove, onEnd: onEnd };
    })();
    
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
    // 清理手势监听与内联样式
    if (modal && modal.__sheetHandlers) {
        try {
            var h = modal.__sheetHandlers;
            if (h.sheet) {
                h.sheet.removeEventListener('touchstart', h.onStart);
                h.sheet.removeEventListener('touchmove', h.onMove);
                h.sheet.removeEventListener('touchend', h.onEnd);
                h.sheet.style.transform = '';
                h.sheet.style.transition = '';
            }
        } catch (e) {}
        delete modal.__sheetHandlers;
    }
    modal.style.opacity = '';
    modal.classList.remove('open');
    setTimeout(function(){ modal.style.display = 'none'; }, 300);
    document.body.style.overflow = ''; // 恢复背景滚动
}

// 获取商品详情
function fetchProductDetail(productID, productUrl, productData) {
    const detailBody = document.getElementById('productDetailBody');
    if (!productID || productID.trim() === '') {
        showBasicProductDetail(productUrl, productData);
        return;
    }
    const timeoutMs = (window.CONFIG && CONFIG.API && CONFIG.API.TIMEOUT) || 10000;
    if (!window.__ffbuy_detailCache) window.__ffbuy_detailCache = {};
    if (!window.__ffbuy_detailInflight) window.__ffbuy_detailInflight = {};
    const cacheKey = productID;
    const cached = window.__ffbuy_detailCache[cacheKey];
    if (cached) {
        renderProductDetail(cached, productUrl, productData);
        return;
    }
    if (window.__ffbuy_detailInflight[cacheKey]) {
        window.__ffbuy_detailInflight[cacheKey]
            .then(data => { if (data) renderProductDetail(data, productUrl, productData); else showBasicProductDetail(productUrl, productData); })
            .catch(() => { showBasicProductDetail(productUrl, productData); });
        return;
    }
    const fetchOopbuyDetails = async () => {
        try {
            const url = `https://webapi.oopbuy.com/product/detail?channel=weidian&refresh=0&spuNo=${encodeURIComponent(productID)}`;
            const controller = new AbortController();
            const t = setTimeout(function(){ controller.abort(); }, timeoutMs);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(t);
            if (res && res.ok) {
                const j = await res.json();
                let list = (j && j.result && j.result.imageList) || [];
                if (!Array.isArray(list)) list = [];
                list = list.map(function(it){ return typeof it === 'string' ? it : (it.url || it.imageUrl || it.img || it.src || ''); }).filter(function(u){ return u && typeof u === 'string'; });
                const d = { data: { images: list } };
                return d;
            }
        } catch (e) {}
        return { data: { images: [] } };
    };
    const p = fetchOopbuyDetails();
    window.__ffbuy_detailInflight[cacheKey] = p;
    p.then(function(data){
        delete window.__ffbuy_detailInflight[cacheKey];
        if (data) {
            window.__ffbuy_detailCache[cacheKey] = data;
            renderProductDetail(data, productUrl, productData);
        } else {
            showBasicProductDetail(productUrl, productData);
        }
    }).catch(function(){
        delete window.__ffbuy_detailInflight[cacheKey];
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
                    <div class="agent-top">
                        <a href="${productUrl}" target="_blank" class="product-detail-buy-btn lovegobuy-btn cnfans-btn" onclick="event.stopPropagation();">
                            <img src="img/cnfans.webp" alt="CNFANS" class="btn-icon">
                        <span class="agent-texts">
                                <span class="agent-name">CNFans</span>
                                <span class="agent-offer-inline">10% OFF + Free Items</span>
                            </span>
                        </a>
                    </div>
                    <div class="agent-grid">
                        <a href="${productData.acbuy || ''}" target="_blank" class="product-detail-buy-btn acbuy-btn" onclick="event.stopPropagation();">
                            <img src="img/acbuy.png" alt="acbuy" class="btn-icon">
                            <span>ACBuy</span>
                        </a>
                        <a href="${productData.oopbuy || ''}" target="_blank" class="product-detail-buy-btn oopbuy-btn" onclick="event.stopPropagation();">
                            <img src="img/oopbuy.webp" alt="oopbuy" class="btn-icon">
                            <span>OopBuy</span>
                        </a>
                        <a href="${productData.kakobuy || ''}" target="_blank" class="product-detail-buy-btn kakobuy-btn" onclick="event.stopPropagation();">
                            <img src="img/kakobuy.webp" alt="kakobuy" class="btn-icon">
                            <span>KakoBuy</span>
                        </a>
                        <a href="${productData.mulebuy || ''}" target="_blank" class="product-detail-buy-btn mulebuy-btn" onclick="event.stopPropagation();">
                            <img src="img/mulebuy.webp" alt="mulebuy" class="btn-icon">
                            <span>MuleBuy</span>
                        </a>
                        <a href="${productData.allchinabuy || ''}" target="_blank" class="product-detail-buy-btn allchinabuy-btn" onclick="event.stopPropagation();">
                            <img src="img/allchinabuy.ico" alt="allchinabuy" class="btn-icon">
                            <span>AllChinaBuy</span>
                        </a>
                        <a href="${productData.loongbuy || ''}" target="_blank" class="product-detail-buy-btn loongbuy-btn" onclick="event.stopPropagation();">
                            <img src="img/loongbuy.webp" alt="loongbuy" class="btn-icon">
                            <span>LoongBuy</span>
                        </a>
                    </div>
              </div>
        </div>
    `;
    const agentBtns1 = detailBody.querySelectorAll('.product-detail-buy-btn');
    agentBtns1.forEach(function(btn){
        btn.addEventListener('click', function(e){
            var href = this.getAttribute('href') || '';
            e.preventDefault();
            e.stopPropagation();
            var name = this.classList.contains('lovegobuy-btn') ? 'lovegobuy' : this.classList.contains('cnfans-btn') ? 'CNFANS' : this.classList.contains('loongbuy-btn') ? 'loongbuy' : this.classList.contains('oopbuy-btn') ? 'oopbuy' : this.classList.contains('allchinabuy-btn') ? 'allchinabuy' : this.classList.contains('mulebuy-btn') ? 'mulebuy' : this.classList.contains('kakobuy-btn') ? 'kakobuy' : this.classList.contains('acbuy-btn') ? 'acbuy' : (this.textContent || '').trim();
            var ctx = window.__ffbuy_currentProduct || {};
            var ok = reportEvent('agent_click', { agent_name: name, product_id: ctx.id || '', product_title: (ctx.title || (productData && productData.spbt) || ''), product_name: (ctx.title || (productData && productData.spbt) || ''), product_url: (ctx.url || productUrl || ''), category: (ctx.category || (window.SPA && window.SPA.currentCategory) || ''), event_callback: function(){ try { if (href) window.open(href, '_blank'); } catch (err) { if (href) location.href = href; } } });
            if (!ok && href) window.open(href, '_blank');
        });
    });
    try {
        var ctx = window.__ffbuy_currentProduct || {};
        reportEvent('detail_view', { product_id: ctx.id || '', product_title: (productData && productData.spbt) || '', product_name: (productData && productData.spbt) || '', product_url: (ctx.url || productUrl || ''), category: (ctx.category || (window.SPA && window.SPA.currentCategory) || '') });
    } catch (e) {}
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
    
    let images = [];
    if (data.images && data.images.length > 0) {
        images = data.images;
    } else if (data.productInfo && Array.isArray(data.productInfo.imgList) && data.productInfo.imgList.length > 0) {
        images = data.productInfo.imgList;
    } else if (data.imgList && data.imgList.length > 0) {
        images = data.imgList;
    } else if (data.productDetail && Array.isArray(data.productDetail.imgList) && data.productDetail.imgList.length > 0) {
        images = data.productDetail.imgList;
    } else {
        images = [productData.ztURL];
    }
    images = images.map(function(u){ return String(u).trim().replace(/`/g, ''); });
    
    // 生成主图和缩略图HTML
    if (images && images.length > 0) {
        var isMobile = window.innerWidth <= 768;
        if (isMobile) {
            imagesHtml = `<div class="product-detail-slider" id="detailSlider">
                <div class="product-detail-slider-track" id="detailSliderTrack">
                    ${images.map(img => `<img src="${img}" class="product-detail-slide" alt="${productData.spbt}">`).join('')}
                </div>
                ${images.length > 1 ? `<div class="product-detail-dots" id="detailSliderDots">${images.map((_,i)=>`<span class="dot${i===0?' active':''}"></span>`).join('')}</div>` : ''}
            </div>`;
        } else {
            imagesHtml = `<img src="${images[0]}" class="product-detail-main-image" alt="${productData.spbt}" id="mainDetailImage">`;
            // 生成缩略图 - 支持横向滚动
            if (images.length > 1) {
                thumbnailsHtml = '<div class="product-detail-thumbnails-wrapper">';
                if (images.length > 4) {
                    thumbnailsHtml += '<div class="thumbnail-scroll-indicator left"><i class="fas fa-chevron-left"></i></div>';
                }
                thumbnailsHtml += '<div class="product-detail-thumbnails">';
                images.forEach((img, index) => {
                    thumbnailsHtml += `<img src="${img}" class="product-detail-thumbnail ${index === 0 ? 'active' : ''}" alt="Thumbnail ${index + 1}">`;
                });
                thumbnailsHtml += '</div>';
                if (images.length > 4) {
                    thumbnailsHtml += '<div class="thumbnail-scroll-indicator right"><i class="fas fa-chevron-right"></i></div>';
                }
                thumbnailsHtml += '</div>';
            }
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
                <div class="agent-top">
                    <a href="${productUrl}" target="_blank" class="product-detail-buy-btn lovegobuy-btn cnfans-btn" onclick="event.stopPropagation();">
                        <img src="img/cnfans.webp" alt="CNFANS" class="btn-icon">
                        <span class="agent-texts">
                            <span class="agent-name">CNFans</span>
                            <span class="agent-offer-inline">10% OFF + Free Items</span>
                        </span>
                    </a>
                </div>
                <div class="agent-grid">
                    <a href="${productData.acbuy || ''}" target="_blank" class="product-detail-buy-btn acbuy-btn" onclick="event.stopPropagation();">
                        <img src="img/acbuy.png" alt="acbuy" class="btn-icon">
                        <span>ACBuy</span>
                    </a>
                    <a href="${productData.oopbuy || ''}" target="_blank" class="product-detail-buy-btn oopbuy-btn" onclick="event.stopPropagation();">
                        <img src="img/oopbuy.webp" alt="oopbuy" class="btn-icon">
                        <span>OopBuy</span>
                    </a>
                    <a href="${productData.kakobuy || ''}" target="_blank" class="product-detail-buy-btn kakobuy-btn" onclick="event.stopPropagation();">
                        <img src="img/kakobuy.webp" alt="kakobuy" class="btn-icon">
                        <span>KakoBuy</span>
                    </a>
                    <a href="${productData.mulebuy || ''}" target="_blank" class="product-detail-buy-btn mulebuy-btn" onclick="event.stopPropagation();">
                        <img src="img/mulebuy.webp" alt="mulebuy" class="btn-icon">
                        <span>MuleBuy</span>
                    </a>
                    <a href="${productData.allchinabuy || ''}" target="_blank" class="product-detail-buy-btn allchinabuy-btn" onclick="event.stopPropagation();">
                        <img src="img/allchinabuy.ico" alt="allchinabuy" class="btn-icon">
                        <span>AllChinaBuy</span>
                    </a>
                    <a href="${productData.loongbuy || ''}" target="_blank" class="product-detail-buy-btn loongbuy-btn" onclick="event.stopPropagation();">
                        <img src="img/loongbuy.webp" alt="loongbuy" class="btn-icon">
                        <span>LoongBuy</span>
                    </a>
                </div>
            </div>
        </div>
    `;
    
    var agentBtns2 = detailBody.querySelectorAll('.product-detail-buy-btn');
    agentBtns2.forEach(function(btn){
        btn.addEventListener('click', function(e){
            var href = this.getAttribute('href') || '';
            e.preventDefault();
            e.stopPropagation();
            var name = this.classList.contains('lovegobuy-btn') ? 'lovegobuy' : this.classList.contains('cnfans-btn') ? 'CNFANS' : this.classList.contains('loongbuy-btn') ? 'loongbuy' : this.classList.contains('oopbuy-btn') ? 'oopbuy' : this.classList.contains('allchinabuy-btn') ? 'allchinabuy' : this.classList.contains('mulebuy-btn') ? 'mulebuy' : this.classList.contains('kakobuy-btn') ? 'kakobuy' : this.classList.contains('acbuy-btn') ? 'acbuy' : (this.textContent || '').trim();
            var ctx = window.__ffbuy_currentProduct || {};
            var ok = reportEvent('agent_click', { agent_name: name, product_id: ctx.id || '', product_title: (ctx.title || (productData && productData.spbt) || ''), product_name: (ctx.title || (productData && productData.spbt) || ''), product_url: (ctx.url || productUrl || ''), category: (ctx.category || (window.SPA && window.SPA.currentCategory) || ''), event_callback: function(){ try { if (href) window.open(href, '_blank'); } catch (err) { if (href) location.href = href; } } });
            if (!ok && href) window.open(href, '_blank');
        });
    });
    try {
        var ctx2 = window.__ffbuy_currentProduct || {};
        reportEvent('detail_view', { product_id: ctx2.id || '', product_title: (data.title || (productData && productData.spbt) || ''), product_name: (data.title || (productData && productData.spbt) || ''), product_url: (ctx2.url || productUrl || ''), category: (ctx2.category || (window.SPA && window.SPA.currentCategory) || '') });
    } catch (e) {}
    const thumbnails = detailBody.querySelectorAll('.product-detail-thumbnail');
    const mainImage = document.getElementById('mainDetailImage');
    var currentImageIndex = 0;
    const thumbnailsContainer = detailBody.querySelector('.product-detail-thumbnails');
    const leftIndicator = detailBody.querySelector('.thumbnail-scroll-indicator.left');
    const rightIndicator = detailBody.querySelector('.thumbnail-scroll-indicator.right');
    
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', function() {
                mainImage.src = images[index];
                currentImageIndex = index;
                
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

    var imagesWrap = detailBody.querySelector('.product-detail-images');
    if (imagesWrap && mainImage && images && images.length > 1 && !document.getElementById('detailSliderTrack')) {
        var startX = 0; var dx = 0; var moved = false;
        function setIndex(i){
            if (i < 0 || i >= images.length) return;
            currentImageIndex = i;
            mainImage.src = images[i];
            if (thumbnails && thumbnails.length) {
                thumbnails.forEach(function(t){ t.classList.remove('active'); });
                var t = thumbnails[i]; if (t) t.classList.add('active');
            }
        }
        imagesWrap.addEventListener('touchstart', function(e){ if (!e.touches || e.touches.length !== 1) return; startX = e.touches[0].clientX; dx = 0; moved = false; }, { passive: true });
        imagesWrap.addEventListener('touchmove', function(e){ if (!e.touches || e.touches.length !== 1) return; dx = e.touches[0].clientX - startX; if (Math.abs(dx) > 10) moved = true; }, { passive: true });
        imagesWrap.addEventListener('touchend', function(){ if (!moved) return; if (Math.abs(dx) > 50) { if (dx < 0 && currentImageIndex < images.length - 1) setIndex(currentImageIndex + 1); else if (dx > 0 && currentImageIndex > 0) setIndex(currentImageIndex - 1); } dx = 0; moved = false; }, { passive: true });
    }

    // 移动端丝滑滑动轮播 + 指示点
    (function(){
        var track = document.getElementById('detailSliderTrack');
        var dotsWrap = document.getElementById('detailSliderDots');
        if (!track || !images || images.length <= 1) return;
        var slider = document.getElementById('detailSlider');
        var index = 0; var startX = 0; var startY = 0; var dx = 0; var dy = 0;
        var width = 0; var dragging = false; var lockedAxis = null; // 'x'|'y'
        function updateSize(){ width = slider.clientWidth; goTo(index, false); }
        function goTo(i, animate){ index = Math.max(0, Math.min(images.length-1, i)); if (animate) track.classList.remove('no-anim'), track.style.transition = ''; else track.classList.add('no-anim'); track.style.transform = 'translateX(' + (-index*width) + 'px)'; updateDots(); slider.classList.remove('sliding'); }
        function updateDots(){ if (!dotsWrap) return; var dots = dotsWrap.querySelectorAll('.dot'); dots.forEach(function(d,i){ if (i===index) d.classList.add('active'); else d.classList.remove('active'); }); }
        updateSize();
        window.addEventListener('resize', updateSize);
        track.addEventListener('touchstart', function(e){ if (!e.touches || e.touches.length!==1) return; startX = e.touches[0].clientX; startY = e.touches[0].clientY; dx = 0; dy = 0; dragging = true; lockedAxis = null; track.classList.add('no-anim'); slider.classList.add('dragging'); }, { passive: true });
        track.addEventListener('touchmove', function(e){ if (!dragging || !e.touches) return; var x = e.touches[0].clientX, y = e.touches[0].clientY; dx = x - startX; dy = y - startY; if (!lockedAxis) { if (Math.abs(dx) > 8) lockedAxis = 'x'; else if (Math.abs(dy) > 8) lockedAxis = 'y'; }
            if (lockedAxis === 'x') { e.preventDefault(); track.style.transform = 'translateX(' + ((-index*width) + dx) + 'px)'; } }, { passive: false });
        track.addEventListener('touchend', function(){ if (!dragging) return; dragging = false; track.classList.remove('no-anim'); var threshold = Math.max(50, width*0.12); if (lockedAxis === 'x') { if (dx < -threshold && index < images.length-1) index++; else if (dx > threshold && index > 0) index--; }
            slider.classList.remove('dragging'); slider.classList.add('sliding'); goTo(index, true); dx = 0; dy = 0; lockedAxis = null; }, { passive: true });
        if (dotsWrap) {
            dotsWrap.addEventListener('click', function(e){ var idx = Array.prototype.indexOf.call(dotsWrap.children, e.target); if (idx >= 0) { index = idx; goTo(index, true); } });
        }
    })();
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
            var wasBound = !!card.dataset.hasClickEvent;
            var clickedLink = e.target.closest('a');
            if (!wasBound && clickedLink) { e.preventDefault(); e.stopPropagation(); }
            if (!wasBound) { bindProductCardClickEvent(card); }
            var pid = card.dataset.productId || '';
            var purl = card.dataset.productUrl || (clickedLink ? clickedLink.href : '');
            var titleEl = card.querySelector('.product-title');
            var imageEl = card.querySelector('.product-image');
            var priceEl = card.querySelector('.us-price');
            var data = { spbt: titleEl ? titleEl.textContent : '', ztURL: imageEl ? imageEl.src : '', US: priceEl ? priceEl.textContent : '' };
            if (window.allProducts && Array.isArray(window.allProducts) && data.spbt) {
                var full = window.allProducts.find(function(p){ return p.spbt === data.spbt; });
                if (full) {
                    if (full.lovegobuy) data.lovegobuy = full.lovegobuy;
                    if (full.loongbuy) data.loongbuy = full.loongbuy;
                    if (full.oopbuy) data.oopbuy = full.oopbuy;
                    if (full.allchinabuy) data.allchinabuy = full.allchinabuy;
                    if (full.mulebuy) data.mulebuy = full.mulebuy;
                    if (full.kakobuy) data.kakobuy = full.kakobuy;
                    if (full.acbuy) data.acbuy = full.acbuy;
                }
            }
            if (!wasBound) {
                gaSendEvent('product_click', { product_id: pid, product_title: data.spbt, product_name: data.spbt, product_url: purl, category: (window.SPA && window.SPA.currentCategory) || '' });
                openProductDetail(pid, purl, data);
                return;
            }
            // 已绑定，交由卡片自己的监听处理
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
            if (fullProductData.lovegobuy) productData.lovegobuy = fullProductData.lovegobuy;
            if (fullProductData.loongbuy) productData.loongbuy = fullProductData.loongbuy;
            if (fullProductData.oopbuy) productData.oopbuy = fullProductData.oopbuy;
            if (fullProductData.allchinabuy) productData.allchinabuy = fullProductData.allchinabuy;
            if (fullProductData.mulebuy) productData.mulebuy = fullProductData.mulebuy;
            if (fullProductData.kakobuy) productData.kakobuy = fullProductData.kakobuy;
            if (fullProductData.acbuy) productData.acbuy = fullProductData.acbuy;
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
        gaSendEvent('product_click', { product_id: pid, product_title: productData.spbt, product_name: productData.spbt, product_url: purl, category: (window.SPA && window.SPA.currentCategory) || '' });
        openProductDetail(this.dataset.productId, this.dataset.productUrl, productData);
    });
    
    // 如果有链接元素，但不是购买按钮，阻止其默认行为
    const linkElements = productCard.querySelectorAll('a:not(.product-detail-buy-btn)');
    if (linkElements.length > 0) {
        linkElements.forEach(linkElement => {
            linkElement.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                var pid = productCard.dataset.productId || '';
                var purl = productCard.dataset.productUrl || '';
                gaSendEvent('product_click', { product_id: pid, product_title: productData.spbt, product_name: productData.spbt, product_url: purl, category: (window.SPA && window.SPA.currentCategory) || '' });
                openProductDetail(pid, purl, productData);
            });
        });
    }
}
