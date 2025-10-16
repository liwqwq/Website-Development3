
function getEventIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function loadEventDetail() {
    const eventId = getEventIdFromURL();
    
    if (!eventId) {
        document.getElementById('event-detail').innerHTML = '<p>Invalid event ID.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}`);
        const event = await response.json();
        
        if (response.status === 404) {
            document.getElementById('event-detail').innerHTML = '<p>Event not found.</p>';
            return;
        }

        const progressPercentage = (event.current_amount / event.goal_amount) * 100;
        
        document.getElementById('event-detail').innerHTML = `
            <div class="event-detail">
                <h1>${event.event_name}</h1>
                <p><strong>Organizer:</strong> ${event.organization_name}</p>
                <p><strong>Category:</strong> ${event.category_name}</p>
                <p><strong>Date & Time:</strong> ${new Date(event.event_datetime).toLocaleString()}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Ticket Price:</strong> $${event.ticket_price || 'Free'}</p>
                
                <h3>Event Description</h3>
                <p>${event.description}</p>
                
                <h3>Fundraising Progress</h3>
                <p>Goal Amount: $${event.goal_amount}</p>
                <p>Raised Amount: $${event.current_amount}</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progressPercentage}%">
                        ${Math.round(progressPercentage)}%
                    </div>
                </div>
                
                <h3>Organizer Information</h3>
                <p>${event.organization_description}</p>
                <p><strong>Contact Details:</strong> ${event.contact_details}</p>
                
                <button class="register-btn" onclick="showRegistrationModal()">Register Now</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading event details:', error);
        document.getElementById('event-detail').innerHTML = '<p>Error loading event details. Please try again later.</p>';
    }
}

function showRegistrationModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('registerModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadEventDetail);