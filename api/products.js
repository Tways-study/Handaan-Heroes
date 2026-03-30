const { getSupabase } = require('./_supabase');

module.exports = async function handler(req, res) {
    const { data, error } = await getSupabase().from('products').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};
