let orderCount = 0;
const selectedItems = [];
const itemCountDisplay = document.getElementById('item-count');
const submitBtn = document.getElementById('submit-order-btn');
const toastContainer = document.getElementById('toast-container');

window.onload = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        if (!response.ok) throw new Error("API failed");
        const products = await response.json();
        renderProducts(products);
    } catch (err) {
        console.error("Could not load products:", err);
        attachButtonListeners(); // Fallback to HTML products
    }
    checkCartState();
};

function renderProducts(products) {
    const grid = document.querySelector('.grid-container');
    grid.innerHTML = '';
    products.forEach(item => {
        const isOutOfStock = item.stock <= 0;
        grid.innerHTML += `
            <div class="card">
                <div class="item-image-wrapper">
                    <img src="${item.image_url}" class="rental-img" onerror="this.onerror=null; this.src=''; this.parentElement.querySelector('.img-fallback').style.display='flex';">
                    <div class="img-fallback" style="display:none"><i class="fa-solid fa-box"></i></div>
                </div>
                <div class="card-details">
                    <h3>${item.name}</h3>
                    <p class="price"><i class="fa-solid fa-tag"></i> ${item.price} <span class="price-unit">/ pc</span></p>
                    <p class="stock"><i class="fa-solid fa-warehouse"></i> Available: <span class="stock-count ${isOutOfStock ? 'out-of-stock' : ''}">${item.stock}</span></p>
                    <button class="add-btn" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-plus"></i> ${isOutOfStock ? 'Sold Out' : 'Add to Order'}
                    </button>
                </div>
            </div>`;
    });
    attachButtonListeners();
}

function attachButtonListeners() {
    document.querySelectorAll('.add-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const name = card.querySelector('h3').innerText;
            const price = card.querySelector('.price').innerText;
            const stockSpan = card.querySelector('.stock-count');
            let stock = parseInt(stockSpan.innerText);

            if (stock > 0) {
                stockSpan.innerText = --stock;
                orderCount++;
                selectedItems.push({ name: name, price: price });
                updateCartUI();
                showToast(`Added ${name} to cart`);
                
                if (stock === 0) {
                    button.disabled = true;
                    button.innerText = "Sold Out";
                    stockSpan.classList.add('out-of-stock');
                }
            }
        });
    });
}

document.getElementById('rental-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
        showToast("Your cart is empty!", true);
        return;
    }

    // Add loading state
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    const orderData = {
        customerName: document.getElementById('customer-name').value,
        date: document.getElementById('rental-date').value,
        contact: document.getElementById('contact-number').value,
        items: selectedItems
    };

    try {
        const response = await fetch('http://localhost:3000/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            showToast("Order Confirmed! Thank you.");
            setTimeout(() => window.location.reload(), 2000);
        } else {
            const resData = await response.json();
            showToast(resData.error || "Failed to submit order", true);
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    } catch (err) {
        showToast("Network error occurred", true);
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});

function updateCartUI() {
    itemCountDisplay.innerText = orderCount;
    const cartItemsList = document.getElementById('cart-items');
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';

    // Sync nav badge
    const cartBadge = document.getElementById('cart-badge');
    if (cartBadge) cartBadge.innerText = orderCount;

    // Sync summary badge
    const summaryBadge = document.getElementById('summary-badge');
    if (summaryBadge) summaryBadge.innerText = `${orderCount} item${orderCount !== 1 ? 's' : ''}`;
    
    const counts = {};
    for (let item of selectedItems) {
        if (!counts[item.name]) counts[item.name] = { count: 0, price: item.price };
        counts[item.name].count++;
    }

    Object.keys(counts).forEach(name => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="cart-item-qty">${counts[name].count}x</span>
                <span class="cart-item-name">${name}</span>
            </div>
            <button type="button" class="remove-btn" data-name="${name}">Remove</button>
        `;
        cartItemsList.appendChild(li);
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nameToRemove = e.target.getAttribute('data-name');
            const idx = selectedItems.findIndex(i => i.name === nameToRemove);
            if (idx !== -1) {
                selectedItems.splice(idx, 1);
                orderCount--;
                
                document.querySelectorAll('.card').forEach(card => {
                    if (card.querySelector('h3').innerText === nameToRemove) {
                        const stockSpan = card.querySelector('.stock-count');
                        let stock = parseInt(stockSpan.innerText);
                        stockSpan.innerText = stock + 1;
                        stockSpan.classList.remove('out-of-stock');
                        const addBtn = card.querySelector('.add-btn');
                        addBtn.disabled = false;
                        addBtn.innerText = "Add to Order";
                    }
                });
                updateCartUI();
                showToast(`Removed 1 ${nameToRemove}`);
            }
        });
    });

    checkCartState();
}

function checkCartState() {
    if (orderCount === 0) {
        submitBtn.disabled = true;
    } else {
        submitBtn.disabled = false;
    }
}

function showToast(message, isError = false) {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    
    const icon = isError ? '⚠️' : '✓';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 3000);
}