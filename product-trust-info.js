// 为商品卡片添加信任提示文字
document.addEventListener('DOMContentLoaded', function() {
    // 监听DOM变化，以便在动态加载的商品卡片上也添加信任提示
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    // 检查是否是商品卡片元素
                    if (node.classList && node.classList.contains('product-card')) {
                        addTrustInfoToCard(node);
                    }
                    // 检查子元素中是否有商品卡片
                    if (node.querySelectorAll) {
                        const cards = node.querySelectorAll('.product-card');
                        cards.forEach(addTrustInfoToCard);
                    }
                });
            }
        });
    });

    // 配置观察器
    const config = { childList: true, subtree: true };
    
    // 开始观察整个文档
    observer.observe(document.body, config);
    
    // 为已存在的商品卡片添加信任提示
    const existingCards = document.querySelectorAll('.product-card');
    existingCards.forEach(addTrustInfoToCard);
    
    // 添加信任提示到商品卡片的函数
    function addTrustInfoToCard(card) {
        // 检查卡片是否已经有信任提示
        if (card.querySelector('.trust-info-text')) {
            return;
        }
        
        // 获取商品信息容器
        const productInfo = card.querySelector('.product-info');
        if (!productInfo) return;
        
        // 创建信任提示元素
        const trustInfo = document.createElement('p');
        trustInfo.className = 'trust-info-text';
        trustInfo.style.fontSize = '12px';
        trustInfo.style.color = '#666';
        trustInfo.style.textAlign = 'center';
        trustInfo.style.marginTop = '6px';
        trustInfo.style.marginBottom = '6px';
        trustInfo.style.padding = '3px 0';
        trustInfo.style.borderTop = '1px dashed #eee';
        trustInfo.style.borderBottom = '1px dashed #eee';
        trustInfo.innerHTML = 'Click to view <span style="color: #2476db; font-weight: 600;">product details</span>';
        
        // 将信任提示插入到价格前面
        const priceDiv = productInfo.querySelector('.product-price');
        if (priceDiv) {
            productInfo.insertBefore(trustInfo, priceDiv);
        } else {
            // 如果找不到价格div，则添加到商品信息容器末尾
            productInfo.appendChild(trustInfo);
        }
    }
});