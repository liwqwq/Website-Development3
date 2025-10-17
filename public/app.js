// Load events list
async function loadEvents() {
    const eventsList = document.getElementById('events-list');
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'block';

    try {
        const response = await fetch('/api/events/search');
        const events = await response.json();
        
        spinner.style.display = 'none';

        if (events.length === 0) {
            eventsList.innerHTML = '<p>No upcoming events found.</p>';
            return;
        }
        
        // Show all events
        eventsList.innerHTML = events.map(event => `
            <div class="event-card">
                <h3><a href="event.html?id=${event.event_id}">${event.event_name}</a></h3>
                <p><strong>Category:</strong> ${event.category_name}</p>
                <p><strong>Date:</strong> ${new Date(event.event_datetime).toLocaleString()}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Ticket Price:</strong> ${event.ticket_price ? '$' + event.ticket_price : 'Free'}</p>
                <p><strong>Fundraising Progress:</strong> $${event.current_amount} / $${event.goal_amount}</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${event.goal_amount ? (event.current_amount / event.goal_amount) * 100 : 0}%"></div>
                </div>
                <a href="event.html?id=${event.event_id}">View Details</a>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        spinner.style.display = 'none';
        eventsList.innerHTML = '<p>Error loading events. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadEvents);
