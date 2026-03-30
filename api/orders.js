const { getSupabase } = require('./_supabase');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        const { data, error } = await getSupabase()
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
};
