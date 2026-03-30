const { getSupabase } = require('./_supabase');

module.exports = async function handler(req, res) {
    if (req.method === 'POST') {
        const { customerName, contact, date, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Order must contain at least one item." });
        }

        const { data, error } = await getSupabase().rpc('place_order', {
            p_customer_name: customerName,
            p_contact_number: contact,
            p_rental_date: date,
            p_items: items
        });

        if (error) return res.status(400).json({ error: error.message });
        return res.json(data);
    }

    if (req.method === 'DELETE') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "Missing order id" });

        const { data, error } = await getSupabase().rpc('cancel_order', {
            p_order_id: parseInt(id)
        });

        if (error) return res.status(400).json({ error: error.message });
        return res.json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
};
