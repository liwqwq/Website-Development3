// ======================= server.js =======================
const express = require('express');
const cors = require('cors');
const db = require('./event_db.js');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===================== User Function =====================

// Get all events
app.get('/api/events', (req, res) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const query = `
        SELECT e.*, c.category_name, o.organization_name 
        FROM events e 
        LEFT JOIN categories c ON e.category_id = c.category_id 
        LEFT JOIN organizations o ON e.organization_id = o.organization_id 
        WHERE e.event_datetime >= ? AND e.is_active = TRUE 
        ORDER BY e.event_datetime ASC
    `;
    db.query(query, [currentDate], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

// Get all categories
app.get('/api/categories', (req, res) => {
    const query = 'SELECT * FROM categories ORDER BY category_name';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

// Get all organizations
app.get('/api/organizations', (req, res) => {
    const query = 'SELECT * FROM organizations ORDER BY organization_name';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

// Search events
app.get('/api/events/search', (req, res) => {
    const { date, location, category } = req.query;
    let query = `
        SELECT e.*, c.category_name, o.organization_name 
        FROM events e 
        LEFT JOIN categories c ON e.category_id = c.category_id 
        LEFT JOIN organizations o ON e.organization_id = o.organization_id 
        WHERE e.is_active = TRUE
    `;
    const params = [];
    if (date) { query += ' AND DATE(e.event_datetime) = ?'; params.push(date); }
    if (location) { query += ' AND e.location LIKE ?'; params.push(`%${location}%`); }
    if (category) { query += ' AND e.category_id = ?'; params.push(category); }
    query += ' ORDER BY e.event_datetime ASC';

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

// Get specific event details
app.get('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    const query = `
        SELECT e.*, c.category_name, o.organization_name, 
               o.description as organization_description, o.contact_details 
        FROM events e 
        LEFT JOIN categories c ON e.category_id = c.category_id 
        LEFT JOIN organizations o ON e.organization_id = o.organization_id 
        WHERE e.event_id = ?
    `;
    db.query(query, [eventId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (results.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(results[0]);
    });
});

// Get registrations for a specific event
app.get('/api/events/:id/registrations', (req, res) => {
    const eventId = req.params.id;
    const query = `
        SELECT r.*, e.event_name, e.ticket_price 
        FROM registrations r 
        JOIN events e ON r.event_id = e.event_id 
        WHERE r.event_id = ? 
        ORDER BY r.registration_date DESC
    `;
    db.query(query, [eventId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

// Create registration
app.post('/api/registrations', (req, res) => {
    const { event_id, full_name, email, phone, ticket_quantity } = req.body;
    if (!event_id || !full_name || !email || !ticket_quantity)
        return res.status(400).json({ error: 'Missing required fields' });

    db.query('SELECT ticket_price FROM events WHERE event_id = ?', [event_id], (err, eventResults) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (eventResults.length === 0) return res.status(404).json({ error: 'Event not found' });

        const ticket_price = eventResults[0].ticket_price || 0;
        const total_amount = ticket_price * ticket_quantity;

        // 检查是否已注册
        db.query('SELECT * FROM registrations WHERE event_id = ? AND email = ?', [event_id, email], (err, checkResults) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (checkResults.length > 0)
                return res.status(400).json({ error: 'You have already registered' });

            // 插入注册信息
            const insertQuery = `
                INSERT INTO registrations (event_id, full_name, email, phone, ticket_quantity, total_amount)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            db.query(insertQuery, [event_id, full_name, email, phone, ticket_quantity, total_amount], (err, results) => {
                if (err) return res.status(500).json({ error: 'Internal server error' });

                //  更新活动 current_amount
                const updateEventQuery = `
                    UPDATE events 
                    SET current_amount = current_amount + ? 
                    WHERE event_id = ?
                `;
                db.query(updateEventQuery, [total_amount, event_id], (err) => {
                    if (err) console.error('Failed to update event current_amount:', err);

                    res.status(201).json({
                        message: 'Registration successful',
                        registration_id: results.insertId,
                        total_amount
                    });
                });
            });
        });
    });
});

// ===================== Admin Function =====================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ success: false, message: 'Missing username or password' });

    db.query('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        if (results.length === 0)
            return res.status(401).json({ success: false, message: 'Invalid username or password' });

        res.json({ success: true, message: 'Login successful' });
    });
});

// Get all events (admin)
app.get('/api/admin/events', (req, res) => {
    const query = `
        SELECT e.*, c.category_name, o.organization_name,
               COUNT(r.registration_id) as registration_count
        FROM events e 
        LEFT JOIN categories c ON e.category_id = c.category_id 
        LEFT JOIN organizations o ON e.organization_id = o.organization_id
        LEFT JOIN registrations r ON e.event_id = r.event_id
        GROUP BY e.event_id
        ORDER BY e.event_datetime DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        res.json({ success: true, events: results });
    });
});

// Create event
app.post('/api/admin/events', (req, res) => {
    const { event_name, description, event_datetime, location, ticket_price, goal_amount, category_id, organization_id } = req.body;
    if (!event_name || !event_datetime || !location || !goal_amount)
        return res.status(400).json({ success: false, message: 'Missing required fields' });

    const query = `
        INSERT INTO events 
        (event_name, description, event_datetime, location, ticket_price, goal_amount, category_id, organization_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, [event_name, description, event_datetime, location, ticket_price, goal_amount, category_id, organization_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        res.status(201).json({ success: true, message: 'Event created successfully', event_id: results.insertId });
    });
});

// Update event
app.put('/api/admin/events/:id', (req, res) => {
    const eventId = req.params.id;
    const { event_name, description, event_datetime, location, ticket_price, goal_amount, current_amount, category_id, organization_id, is_active } = req.body;
    const query = `
        UPDATE events 
        SET event_name=?, description=?, event_datetime=?, location=?, 
            ticket_price=?, goal_amount=?, current_amount=?, category_id=?, 
            organization_id=?, is_active=? WHERE event_id=?`;
    db.query(query, [event_name, description, event_datetime, location, ticket_price, goal_amount, current_amount, category_id, organization_id, is_active, eventId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        res.json({ success: true, message: 'Event updated successfully' });
    });
});

// Delete event
app.delete('/api/admin/events/:id', (req, res) => {
    const eventId = req.params.id;
    const checkQuery = 'SELECT COUNT(*) as registration_count FROM registrations WHERE event_id = ?';
    db.query(checkQuery, [eventId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        if (results[0].registration_count > 0)
            return res.status(400).json({ success: false, message: 'Cannot delete event with existing registrations' });

        db.query('DELETE FROM events WHERE event_id = ?', [eventId], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
            if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Event not found' });
            res.json({ success: true, message: 'Event deleted successfully' });
        });
    });
});

// ===================== Statistics =====================
app.get('/api/admin/stats', (req, res) => {
    const stats = {};

    // Total events
    db.query('SELECT COUNT(*) AS total_events FROM events', (err, result1) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        stats.total_events = result1[0].total_events;

        // Total registrations
        db.query('SELECT COUNT(*) AS total_registrations FROM registrations', (err, result2) => {
            if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
            stats.total_registrations = result2[0].total_registrations;

            // Total donations = events.current_amount + registrations.total_amount
            db.query(`
                SELECT 
                    IFNULL(SUM(current_amount),0) AS total_event_donations,
                    (SELECT IFNULL(SUM(total_amount),0) FROM registrations) AS total_registration_amount
                FROM events
            `, (err, result3) => {
                if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
                const totalEventDonations = Math.round(result3[0].total_event_donations || 0);
                const totalRegistrationAmount = Math.round(result3[0].total_registration_amount || 0);
                stats.total_donations = totalEventDonations + totalRegistrationAmount;

                res.json({ success: true, stats });
            });
        });
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
