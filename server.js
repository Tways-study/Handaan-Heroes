require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Connected to the Handaan Heroes Supabase database.');

// --- ROUTES ---

app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get all orders for Admin
app.get('/api/orders', async (req, res) => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/order', async (req, res) => {
    const { customerName, contact, date, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item." });
    }

    const { data, error } = await supabase.rpc('place_order', {
        p_customer_name: customerName,
        p_contact_number: contact,
        p_rental_date: date,
        p_items: items
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Delete an order
app.delete('/api/order/:id', async (req, res) => {
    const { data, error } = await supabase.rpc('cancel_order', {
        p_order_id: parseInt(req.params.id)
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Local dev only — Vercel handles the server in production
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
}

module.exports = app;