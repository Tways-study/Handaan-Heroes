let orderCount = 0;
const selectedItems = [];
const itemCountDisplay = document.getElementById('item-count');

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
};

function renderProducts(products) {
    const grid = document.querySelector('.grid-container');
    grid.innerHTML = '';
    products.forEach(item => {
        grid.innerHTML += `
            <div class="card">
                <div class="item-image-wrapper">
                    <img src="${item.image_url}" class="rental-img">
                </div>
                <div class="card-details">
                    <h3>${item.name}</h3>
                    <p class="price">${item.price}</p>
                    <p class="stock">Available: <span class="stock-count">${item.stock}</span></p>
                    <button class="add-btn">Add to Order</button>
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
                
                if (stock === 0) {
                    button.disabled = true;
                    button.innerText = "Sold Out";
                }
            }
        });
    });
}

document.getElementById('rental-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderData = {
        customerName: document.getElementById('customer-name').value,
        date: document.getElementById('rental-date').value,
        contact: document.getElementById('contact-number').value,
        items: selectedItems
    };

    const response = await fetch('http://localhost:3000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });

    if (response.ok) {
        alert("Order Saved!");
        window.location.reload(); // THIS refreshes the stock from the DB
    }
});

function updateCartUI() {
    itemCountDisplay.innerText = orderCount;
    const cartItemsList = document.getElementById('cart-items');
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';
    
    const counts = {};
    for (let item of selectedItems) {
        if (!counts[item.name]) counts[item.name] = { count: 0, price: item.price };
        counts[item.name].count++;
    }

    Object.keys(counts).forEach(name => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '5px';
        li.innerHTML = `<span>${counts[name].count}x ${name}</span> <button type="button" class="remove-btn" data-name="${name}" style="background: #ff4d4d; color: white; border: none; border-radius: 3px; padding: 2px 5px; cursor: pointer;">Remove 1</button>`;
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
                        const addBtn = card.querySelector('.add-btn');
                        addBtn.disabled = false;
                        addBtn.innerText = "Add to Order";
                    }
                });
                updateCartUI();
            }
        });
    });
}