const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./rentals.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the Handaan Heroes database.');
});

// Database Setup
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price TEXT,
        stock INTEGER,
        image_url TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        contact_number TEXT,
        rental_date TEXT,
        items_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            const insert = 'INSERT INTO products (name, price, stock, image_url) VALUES (?,?,?,?)';
            db.run(insert, ['Standard Ruby Plastic Chair', '₱15.00', 30, 'img1.jpg']);
            db.run(insert, ['Lifetime Rectangle Foldable Table', '₱150.00', 2, 'img2.jpg']);
        }
    });
});

app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/order', (req, res) => {
    const { customerName, contact, date, items } = req.body;

    // 1. Save Order
    const orderSql = `INSERT INTO orders (customer_name, contact_number, rental_date, items_json) VALUES (?, ?, ?, ?)`;
    db.run(orderSql, [customerName, contact, date, JSON.stringify(items)], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Update Stock for each item
        items.forEach(item => {
            const updateSql = `UPDATE products SET stock = stock - 1 WHERE name = ? AND stock > 0`;
            db.run(updateSql, [item.name.trim()], (uErr) => {
                if (uErr) console.error("Update Error:", uErr.message);
            });
        });

        res.json({ message: "Order processed", orderId: this.lastID });
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));