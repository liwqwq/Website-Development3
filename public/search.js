let categories = [];

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">All Categories</option>' + 
            categories.map(cat => `<option value="${cat.category_id}">${cat.category_name}</option>`).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function searchEvents(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.date) params.append('date', filters.date);
        if (filters.location) params.append('location', filters.location);
        if (filters.category) params.append('category', filters.category);

        const response = await fetch(`/api/events/search?${params}`);
        const events = await response.json();
        
        const resultsDiv = document.getElementById('search-results');
        const errorDiv = document.getElementById('error-message');
        
        errorDiv.style.display = 'none';

        if (events.length === 0) {
            resultsDiv.innerHTML = '<p>No matching events found.</p>';
            return;
        }
        
        resultsDiv.innerHTML = events.map(event => `
            <div class="event-card">
                <h3><a href="event.html?id=${event.event_id}">${event.event_name}</a></h3>
                <p><strong>Category:</strong> ${event.category_name}</p>
                <p><strong>Date:</strong> ${new Date(event.event_datetime).toLocaleString()}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Ticket Price:</strong> $${event.ticket_price || 'Free'}</p>
                <a href="event.html?id=${event.event_id}">View Details</a>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error searching events:', error);
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = 'Error occurred while searching. Please try again later.';
        errorDiv.style.display = 'block';
    }
}

document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const filters = {
        date: formData.get('date'),
        location: formData.get('location'),
        category: formData.get('category')
    };
    
    searchEvents(filters);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('searchForm').reset();
    document.getElementById('search-results').innerHTML = '<p>Please enter search criteria to find events.</p>';
    document.getElementById('error-message').style.display = 'none';
});

document.addEventListener('DOMContentLoaded', loadCategories);