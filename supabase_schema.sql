-- ============================================================
-- Handaan Heroes - Supabase Schema
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT,
    stock INTEGER DEFAULT 0,
    image_url TEXT
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name TEXT,
    contact_number TEXT,
    rental_date TEXT,
    items_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW ()
);

-- 3. Seed Data (only inserts if table is empty)
INSERT INTO
    products (name, price, stock, image_url)
SELECT 'Standard Ruby Plastic Chair', '₱15.00', 30, 'img1.jpg'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        LIMIT 1
    );

INSERT INTO
    products (name, price, stock, image_url)
SELECT 'Lifetime Rectangle Foldable Table', '₱150.00', 2, 'img2.jpg'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Lifetime Rectangle Foldable Table'
    );

-- ============================================================
-- 4. RPC Function: place_order (atomic stock decrement + insert)
-- ============================================================
CREATE OR REPLACE FUNCTION place_order(
    p_customer_name TEXT,
    p_contact_number TEXT,
    p_rental_date TEXT,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    item JSONB;
    item_name TEXT;
    item_counts JSONB := '{}';
    current_stock INTEGER;
    order_id INTEGER;
    key TEXT;
    cnt INTEGER;
BEGIN
    -- Tally item counts
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        item_name := item->>'name';
        item_counts := jsonb_set(
            item_counts,
            ARRAY[item_name],
            to_jsonb(COALESCE((item_counts->>item_name)::INTEGER, 0) + 1)
        );
    END LOOP;

    -- Check and decrement stock for each unique item
    FOR key IN SELECT jsonb_object_keys(item_counts)
    LOOP
        cnt := (item_counts->>key)::INTEGER;
        SELECT stock INTO current_stock FROM products WHERE name = key FOR UPDATE;

        IF current_stock IS NULL OR current_stock < cnt THEN
            RAISE EXCEPTION 'Not enough stock for item: %', key;
        END IF;

        UPDATE products SET stock = stock - cnt WHERE name = key;
    END LOOP;

    -- Insert the order
    INSERT INTO orders (customer_name, contact_number, rental_date, items_json)
    VALUES (p_customer_name, p_contact_number, p_rental_date, p_items)
    RETURNING id INTO order_id;

    RETURN jsonb_build_object('message', 'Success', 'orderId', order_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. RPC Function: cancel_order (atomic stock restore + delete)
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_order(p_order_id INTEGER) RETURNS JSONB AS $$
DECLARE
    order_items JSONB;
    item JSONB;
    item_name TEXT;
    item_counts JSONB := '{}';
    key TEXT;
    cnt INTEGER;
BEGIN
    SELECT items_json INTO order_items FROM orders WHERE id = p_order_id;

    IF order_items IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Tally item counts
    FOR item IN SELECT * FROM jsonb_array_elements(order_items)
    LOOP
        item_name := item->>'name';
        item_counts := jsonb_set(
            item_counts,
            ARRAY[item_name],
            to_jsonb(COALESCE((item_counts->>item_name)::INTEGER, 0) + 1)
        );
    END LOOP;

    -- Restore stock
    FOR key IN SELECT jsonb_object_keys(item_counts)
    LOOP
        cnt := (item_counts->>key)::INTEGER;
        UPDATE products SET stock = stock + cnt WHERE name = key;
    END LOOP;

    -- Delete the order
    DELETE FROM orders WHERE id = p_order_id;

    RETURN jsonb_build_object('message', 'Deleted and stock restored');
END;
$$ LANGUAGE plpgsql;