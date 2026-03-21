let orderCount = 0;
const selectedItems = [];
const itemCountDisplay = document.getElementById('item-count');

window.onload = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const products = await response.json();
        renderProducts(products);
    } catch (err) {
        console.error("Could not load products:", err);
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
                itemCountDisplay.innerText = orderCount;
                
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
    const inputs = e.target.querySelectorAll('input');
    const orderData = {
        customerName: inputs[0].value,
        date: inputs[1].value,
        contact: inputs[2].value,
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