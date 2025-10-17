document.addEventListener('DOMContentLoaded', () => {
    const addEventForm = document.getElementById('addEventForm');
    const eventTableContainer = document.getElementById('eventTableContainer');

    let categories = [];
    let organizations = [];

    // Load category and organizational data
    loadCategoriesAndOrganizations();
    loadEvents();
    loadAdminStats();

    async function loadCategoriesAndOrganizations() {
        try {
            // Load category
            const catRes = await fetch('/api/categories');
            if (!catRes.ok) throw new Error('Failed to load categories');
            categories = await catRes.json();

            const categorySelect = document.getElementById('categoryId');
            categorySelect.innerHTML = '<option value="">Select category</option>' +
                categories.map(cat => `<option value="${cat.category_id}">${cat.category_name}</option>`).join('');

            // Load organization
            const orgRes = await fetch('/api/organizations');
            if (!orgRes.ok) throw new Error('Failed to load organizations');
            organizations = await orgRes.json();

            const orgSelect = document.getElementById('organizationId');
            orgSelect.innerHTML = '<option value="">Select organization</option>' +
                organizations.map(org => `<option value="${org.organization_id}">${org.organization_name}</option>`).join('');

            console.log('Loaded categories:', categories.length);
            console.log('Loaded organizations:', organizations.length);

        } catch (err) {
            console.error('Data loading failed:', err);
            alert('Failed to load category and organization data, please check the console');
        }
    }

    // Load admin statistics data
    async function loadAdminStats() {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();

            if (data.success && data.stats) {
                document.getElementById('totalEvents').textContent = data.stats.total_events || 0;
                document.getElementById('totalRegistrations').textContent = data.stats.total_registrations || 0;

                // Direct display of total donations
                const donationValue = parseFloat(data.stats.total_donations) || 0;
                document.getElementById('totalDonations').textContent = `$${donationValue}`;
            } else {
                console.warn('Statistical data loading failed:', data.message || data);
            }
        } catch (err) {
            console.error('Unable to load statistical data:', err);
        }
    }

    // Form submission processing
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditMode = addEventForm.dataset.editMode === 'true';
        const eventId = addEventForm.dataset.editId;

        const formData = {
            event_name: document.getElementById('eventName').value.trim(),
            description: document.getElementById('eventDescription').value.trim(),
            event_datetime: document.getElementById('eventDatetime').value,
            location: document.getElementById('eventLocation').value.trim(),
            ticket_price: parseFloat(document.getElementById('ticketPrice').value) || 0,
            goal_amount: parseFloat(document.getElementById('goalAmount').value),
            category_id: document.getElementById('categoryId').value || null,
            organization_id: document.getElementById('organizationId').value || null,
            current_amount: document.getElementById('currentAmount') ? parseFloat(document.getElementById('currentAmount').value) || 0 : 0,
            is_active: document.getElementById('isActive') ? document.getElementById('isActive').checked : true
        };

        // Verify required fields
        if (!formData.event_name || !formData.event_datetime || !formData.location || !formData.goal_amount) {
            alert('Please fill in all required fields (marked with *)');
            return;
        }

        try {
            const url = isEditMode ? `/api/admin/events/${eventId}` : '/api/admin/events';
            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                alert(isEditMode ? 'Event updated successfully!' : 'Event added successfully!');
                resetForm();
                loadEvents();
            } else {
                alert('Operation failed: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Operation failed:', err);
            alert('Operation failed, please check the console error message');
        }
    });

    // Reset Form 
    function resetForm() {
        const currentAmountField = document.getElementById('currentAmount');
        if (currentAmountField) {
            const parentDiv = currentAmountField.closest('.form-group');
            if (parentDiv) parentDiv.remove();
        }

        //Reset form content
        addEventForm.reset();
        delete addEventForm.dataset.editMode;
        delete addEventForm.dataset.editId;

        const submitBtn = addEventForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Add event';
        submitBtn.className = 'btn-primary';
    }

// Click the reset button
const resetBtn = document.querySelector('#addEventForm button[type="reset"]');
if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        window.location.reload(); 
    });
}


    // Load activity list
    async function loadEvents() {
        if (!eventTableContainer) return;
        eventTableContainer.innerHTML = '<p>Loading event...</p>';

        try {
            const res = await fetch('/api/admin/events');
            const data = await res.json();

            if (!data.success || !data.events || data.events.length === 0) {
                eventTableContainer.innerHTML = '<p>There are currently no events available</p>';
                return;
            }

            const events = data.events;

            // Create management table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '1rem';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr style="background: #f5f5f5;">
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">ID</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Event Name</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Time</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Location</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Target Amount</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Raised Amount</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Number of Registrations</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Status</th>
                    <th style="border:1px solid #ddd; padding:12px; text-align:left;">Operation</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            events.forEach(event => {
                const tr = document.createElement('tr');
                const eventDate = new Date(event.event_datetime).toLocaleString();
                const isPast = new Date(event.event_datetime) < new Date();

                tr.innerHTML = `
                    <td style="border:1px solid #ddd; padding:10px;">${event.event_id}</td>
                    <td style="border:1px solid #ddd; padding:10px;">
                        <strong>${event.event_name}</strong>
                        <br><small>${event.category_name || 'No Category'}</small>
                    </td>
                    <td style="border:1px solid #ddd; padding:10px;">${eventDate}</td>
                    <td style="border:1px solid #ddd; padding:10px;">${event.location}</td>
                    <td style="border:1px solid #ddd; padding:10px;">$${event.goal_amount}</td>
                    <td style="border:1px solid #ddd; padding:10px;">$${event.current_amount || 0}</td>
                    <td style="border:1px solid #ddd; padding:10px;">${event.registration_count || 0}</td>
                    <td style="border:1px solid #ddd; padding:10px;">
                        <span style="color: ${event.is_active ? (isPast ? '#e67e22' : '#27ae60') : '#e74c3c'};">
                            ${event.is_active ? (isPast ? 'Ended ':' In Progress'): 'Paused'}
                        </span>
                    </td>
                    <td style="border:1px solid #ddd; padding:10px;">
                        <button class="btn-primary edit-btn" data-id="${event.event_id}" style="margin:2px; padding: 6px 12px;">Edit</button>
                        <button class="btn-secondary delete-btn" data-id="${event.event_id}" style="margin:2px; padding: 6px 12px;">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            eventTableContainer.innerHTML = '';
            eventTableContainer.appendChild(table);

            // Edit button
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const eventId = btn.dataset.id;
                    await loadEventForEdit(eventId);
                });
            });

            // Delete button
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const eventId = btn.dataset.id;
                    if (!confirm('Are you sure to delete this event?')) return;

                    try {
                        const delRes = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
                        const data = await delRes.json();
                        if (data.success) {
                            alert('Deleted successfully');
                            loadEvents();
                        } else {
                            alert('Deletion failed: ' + (data.message || 'Unknown error'));
                        }
                    } catch (err) {
                        console.error('Delete event failed:', err);
                        alert('Error deleting event');
                    }
                });
            });

        } catch (err) {
            console.error('Loading event failed:', err);
            eventTableContainer.innerHTML = '<p>Loading event failed, please refresh and retry</p>';
        }
    }

    // Load event data into the editing form
    async function loadEventForEdit(eventId) {
        try {
            const res = await fetch(`/api/events/${eventId}`);
            if (!res.ok) throw new Error('Failed to load event data');
            const event = await res.json();

            document.getElementById('eventName').value = event.event_name;
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventDatetime').value = event.event_datetime.slice(0, 16);
            document.getElementById('eventLocation').value = event.location;
            document.getElementById('ticketPrice').value = event.ticket_price || 0;
            document.getElementById('goalAmount').value = event.goal_amount;
            document.getElementById('categoryId').value = event.category_id || '';
            document.getElementById('organizationId').value = event.organization_id || '';

            addEditModeFields(event);

            addEventForm.dataset.editMode = 'true';
            addEventForm.dataset.editId = eventId;

            const submitBtn = addEventForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Update Event';
            submitBtn.className = 'btn-primary';

            addEventForm.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error('Failed to load event data:', err);
            alert('Failed to load event data');
        }
    }

    function addEditModeFields(event) {
        const existingCurrent = document.getElementById('currentAmount');
        if (existingCurrent) {
            const parentDiv = existingCurrent.closest('.form-group');
            if (parentDiv) parentDiv.remove();
        }

        if (!event) return;

        const goalAmountGroup = document.getElementById('goalAmount').parentNode;
        const currentAmountHtml = `
            <div class="form-group">
                <label for="currentAmount">Raised amount</label>
                <input type="number" id="currentAmount" step="0.01" min="0" value="${event.current_amount || 0}">
            </div>
        `;
        goalAmountGroup.insertAdjacentHTML('afterend', currentAmountHtml);

        // Event Status Field
        const isActiveField = document.getElementById('isActive');
        if (!isActiveField) {
            const formActions = document.querySelector('.form-actions');
            const isActiveHtml = `
                <div class="form-group">
                    <label for="isActive" style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="isActive" ${event.is_active ? 'checked' : ''}>
                        Event status (activated)
                    </label>
                </div>
            `;
            formActions.insertAdjacentHTML('beforebegin', isActiveHtml);
        } else {
            isActiveField.checked = event.is_active;
        }
    }
});
