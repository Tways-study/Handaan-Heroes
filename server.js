const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./rentals.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the Handaan Heroes database.');
});

db.serialize(() => {
    // 1. Create Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price TEXT,
        stock INTEGER,
        image_url TEXT
    )`);

    // 2. Create Orders Table (Ensuring column names are consistent)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        contact_number TEXT,
        rental_date TEXT,
        items_json TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Seed Data
    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            console.log("🌱 Planting seed data...");
            const insert = 'INSERT INTO products (name, price, stock, image_url) VALUES (?,?,?,?)';
            db.run(insert, ['Standard Ruby Plastic Chair', '₱15.00', 30, 'img1.jpg']);
            db.run(insert, ['Lifetime Rectangle Foldable Table', '₱150.00', 2, 'img2.jpg']);
        }
    });
});

// --- ROUTES ---

app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// New Route: Get all orders for Admin
app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/order', (req, res) => {
    const { customerName, contact, date, items } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item." });
    }

    const itemCounts = {};
    for (let item of items) {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
    }
    const itemNames = Object.keys(itemCounts);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        let hasError = false;
        let completed = 0;

        for (let name of itemNames) {
            db.run(`UPDATE products SET stock = stock - ? WHERE name = ? AND stock >= ?`,
                [itemCounts[name], name, itemCounts[name]],
                function(err) {
                    if (err || this.changes === 0) hasError = true;
                    completed++;
                    
                    if (completed === itemNames.length) {
                        if (hasError) {
                            db.run("ROLLBACK", () => res.status(400).json({ error: "Not enough stock for some items." }));
                        } else {
                            const orderSql = `INSERT INTO orders (customer_name, contact_number, rental_date, items_json) VALUES (?, ?, ?, ?)`;
                            db.run(orderSql, [customerName, contact, date, JSON.stringify(items)], function(err) {
                                if (err) {
                                    db.run("ROLLBACK", () => res.status(500).json({ error: err.message }));
                                } else {
                                    db.run("COMMIT", () => res.json({ message: "Success", orderId: this.lastID }));
                                }
                            });
                        }
                    }
                }
            );
        }
    });
});

// New Route: Delete an order
app.delete('/api/order/:id', (req, res) => {
    db.get("SELECT items_json FROM orders WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Order not found" });

        const items = JSON.parse(row.items_json);
        const itemCounts = {};
        for (let item of items) {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            let hasError = false;
            let completed = 0;
            const itemNames = Object.keys(itemCounts);
            
            if (itemNames.length === 0) {
                deleteOrderAndCommit();
            } else {
                for (let name of itemNames) {
                    db.run("UPDATE products SET stock = stock + ? WHERE name = ?", 
                        [itemCounts[name], name], 
                        function(uErr) {
                            if (uErr) hasError = true;
                            completed++;
                            if (completed === itemNames.length) {
                                if (hasError) {
                                    db.run("ROLLBACK", () => res.status(500).json({ error: "Failed to restore stock" }));
                                } else {
                                    deleteOrderAndCommit();
                                }
                            }
                        }
                    );
                }
            }

            function deleteOrderAndCommit() {
                db.run("DELETE FROM orders WHERE id = ?", req.params.id, function(dErr) {
                    if (dErr) {
                        db.run("ROLLBACK", () => res.status(500).json({ error: dErr.message }));
                    } else {
                        db.run("COMMIT", () => res.json({ message: "Deleted and stock restored" }));
                    }
                });
            }
        });
    });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));