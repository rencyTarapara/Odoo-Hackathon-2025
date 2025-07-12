// Enhanced Skill Swap Platform JavaScript with Backend Integration

// Global variables
let currentUser = null;
let users = [];
let swapRequests = [];
let messages = [];
let notifications = [];
let currentSection = 'dashboard';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Check if user is logged in
        if (authToken) {
            // Verify token and get user data
            const userData = await apiRequest('/users/profile');
            currentUser = userData.user;
            loadUserData();
        } else {
            // Redirect to login if not logged in
            window.location.href = 'login.html';
            return;
        }

        // Load initial data
        await Promise.all([
            loadUsers(),
            loadSwapRequests(),
            loadMessages(),
            loadNotifications()
        ]);
        
        updateDashboard();
        
        // Show dashboard by default
        showSection('dashboard');
        
        // Check if user is admin
        if (currentUser.role === 'admin') {
            document.getElementById('admin-link').style.display = 'block';
        }

        // Set up real-time updates
        setupRealTimeUpdates();
    } catch (error) {
        console.error('Initialization error:', error);
        // If token is invalid, redirect to login
        if (error.message.includes('Invalid token')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    }
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.remove('d-none');
    currentSection = sectionName;
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'browse':
            loadUsers();
            break;
        case 'requests':
            loadSwapRequests();
            break;
        case 'messages':
            loadMessages();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'profile':
            loadProfileForm();
            break;
        case 'admin':
            if (currentUser.role === 'admin') {
                loadAdminData();
            }
            break;
    }
}

// User management functions
async function loadUserData() {
    try {
        const response = await apiRequest('/users');
        users = response;
    } catch (error) {
        console.error('Load users error:', error);
    }
}

async function loadUsers() {
    try {
        const response = await apiRequest('/users');
        const usersGrid = document.getElementById('users-grid');
        usersGrid.innerHTML = '';
        
        response.forEach(user => {
            const userCard = createUserCard(user);
            usersGrid.appendChild(userCard);
        });
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    card.innerHTML = `
        <div class="user-card-header">
            <img src="${user.photo || 'https://via.placeholder.com/60'}" alt="${user.name}" class="user-avatar">
            <h3>${user.name}</h3>
            <p>${user.location}</p>
            <div class="skill-tags">
                ${user.skillsOffered.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        </div>
        <div class="user-card-body">
            <h4>Skills Wanted:</h4>
            <div class="skill-tags">
                ${user.skillsWanted.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
            <p><strong>Rating:</strong> ${user.rating}/5 (${user.totalSwaps} swaps)</p>
            <button class="btn btn-primary" onclick="openUserModal(${user.id})">Request Swap</button>
        </div>
    `;
    
    return card;
}

// Profile management
function loadProfileForm() {
    const user = currentUser;
    
    document.getElementById('name').value = user.name;
    document.getElementById('location').value = user.location || '';
    document.getElementById('public-profile').checked = user.isPublic;
    
    // Load skills
    loadSkillTags('offered-skills-tags', user.skillsOffered);
    loadSkillTags('wanted-skills-tags', user.skillsWanted);
    
    // Load availability
    user.availability.forEach(avail => {
        const checkbox = document.querySelector(`input[value="${avail}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

async function updateProfile(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('location', document.getElementById('location').value);
        formData.append('isPublic', document.getElementById('public-profile').checked);
        
        // Add skills
        const offeredSkills = getSkillsFromTags('offered-skills-tags');
        const wantedSkills = getSkillsFromTags('wanted-skills-tags');
        formData.append('skillsOffered', JSON.stringify(offeredSkills));
        formData.append('skillsWanted', JSON.stringify(wantedSkills));
        
        // Add availability
        const availability = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        formData.append('availability', JSON.stringify(availability));
        
        // Handle file upload
        const photoFile = document.getElementById('profile-photo-input').files[0];
        if (photoFile) {
            formData.append('photo', photoFile);
        }
        
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        alert('Profile updated successfully!');
        showSection('dashboard');
    } catch (error) {
        console.error('Update profile error:', error);
        alert('Failed to update profile');
    }
}

function addSkill(type) {
    const inputId = type === 'offered' ? 'skill-offered' : 'skill-wanted';
    const tagsId = type === 'offered' ? 'offered-skills-tags' : 'wanted-skills-tags';
    
    const input = document.getElementById(inputId);
    const skill = input.value.trim();
    
    if (skill) {
        const tagsContainer = document.getElementById(tagsId);
        const tag = document.createElement('span');
        tag.className = 'skill-tag remove';
        tag.innerHTML = `${skill} <i class="fas fa-times" onclick="removeSkill(this)"></i>`;
        tagsContainer.appendChild(tag);
        input.value = '';
    }
}

function removeSkill(element) {
    element.parentElement.remove();
}

function loadSkillTags(containerId, skills) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    skills.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag remove';
        tag.innerHTML = `${skill} <i class="fas fa-times" onclick="removeSkill(this)"></i>`;
        container.appendChild(tag);
    });
}

function getSkillsFromTags(containerId) {
    const container = document.getElementById(containerId);
    const tags = container.querySelectorAll('.skill-tag');
    return Array.from(tags).map(tag => tag.textContent.trim().replace('×', '').trim());
}

// Swap request functions
function openUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('modal-user-name').textContent = user.name;
    document.getElementById('modal-user-details').innerHTML = `
        <p><strong>Location:</strong> ${user.location}</p>
        <p><strong>Skills Offered:</strong> ${user.skillsOffered.join(', ')}</p>
        <p><strong>Skills Wanted:</strong> ${user.skillsWanted.join(', ')}</p>
        <p><strong>Rating:</strong> ${user.rating}/5</p>
    `;
    
    document.getElementById('user-modal').style.display = 'block';
    window.selectedUserId = userId;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function sendSwapRequest() {
    try {
        const message = document.getElementById('swap-message').value;
        const targetUserId = window.selectedUserId;
        
        await apiRequest('/swap-requests', {
            method: 'POST',
            body: JSON.stringify({
                toUserId: targetUserId,
                message: message
            })
        });
        
        closeModal('user-modal');
        alert('Swap request sent successfully!');
        
        // Clear message
        document.getElementById('swap-message').value = '';
        
        // Reload requests
        await loadSwapRequests();
    } catch (error) {
        console.error('Send swap request error:', error);
        alert('Failed to send swap request');
    }
}

async function loadSwapRequests() {
    try {
        const response = await apiRequest('/swap-requests');
        swapRequests = response;
        
        const sentContainer = document.getElementById('sent-requests');
        const receivedContainer = document.getElementById('received-requests');
        
        const sentRequests = swapRequests.filter(req => req.fromUserId === currentUser.id);
        const receivedRequests = swapRequests.filter(req => req.toUserId === currentUser.id);
        
        // Display sent requests
        sentContainer.innerHTML = '<h3>Sent Requests</h3>';
        sentRequests.forEach(request => {
            const requestElement = createRequestElement(request, request.toUser, 'sent');
            sentContainer.appendChild(requestElement);
        });
        
        // Display received requests
        receivedContainer.innerHTML = '<h3>Received Requests</h3>';
        receivedRequests.forEach(request => {
            const requestElement = createRequestElement(request, request.fromUser, 'received');
            receivedContainer.appendChild(requestElement);
        });
    } catch (error) {
        console.error('Load swap requests error:', error);
    }
}

function createRequestElement(request, user, type) {
    const div = document.createElement('div');
    div.className = 'request-item';
    
    const statusClass = request.status === 'pending' ? 'warning' : 
                       request.status === 'accepted' ? 'success' : 'danger';
    
    div.innerHTML = `
        <div class="request-info">
            <h4>${user.name}</h4>
            <p><strong>Status:</strong> <span class="text-${statusClass}">${request.status}</span></p>
            ${request.message ? `<p><strong>Message:</strong> ${request.message}</p>` : ''}
            <p><strong>Date:</strong> ${new Date(request.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="request-actions">
            ${type === 'received' && request.status === 'pending' ? `
                <button class="btn btn-success" onclick="respondToRequest(${request.id}, 'accepted')">Accept</button>
                <button class="btn btn-danger" onclick="respondToRequest(${request.id}, 'rejected')">Reject</button>
            ` : ''}
            ${request.status === 'pending' ? `
                <button class="btn btn-danger" onclick="deleteRequest(${request.id})">Delete</button>
            ` : ''}
        </div>
    `;
    
    return div;
}

async function respondToRequest(requestId, response) {
    try {
        await apiRequest(`/swap-requests/${requestId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: response })
        });
        
        await loadSwapRequests();
        await loadNotifications();
    } catch (error) {
        console.error('Respond to request error:', error);
        alert('Failed to update request');
    }
}

async function deleteRequest(requestId) {
    try {
        await apiRequest(`/swap-requests/${requestId}`, {
            method: 'DELETE'
        });
        
        await loadSwapRequests();
    } catch (error) {
        console.error('Delete request error:', error);
        alert('Failed to delete request');
    }
}

// Messages functions
async function loadMessages() {
    try {
        const response = await apiRequest('/messages');
        messages = response;
        
        const messageList = document.getElementById('message-list');
        messageList.innerHTML = '';
        
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            messageList.appendChild(messageElement);
        });
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message-item';
    
    const isFromMe = message.fromUserId === currentUser.id;
    const otherUser = isFromMe ? message.toUser : message.fromUser;
    
    div.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${otherUser.name}</span>
            <span class="message-time">${new Date(message.createdAt).toLocaleDateString()}</span>
        </div>
        <p><strong>Subject:</strong> ${message.subject}</p>
        <p>${message.body}</p>
        ${!message.isRead && !isFromMe ? '<span class="badge">New</span>' : ''}
    `;
    
    return div;
}

function openNewMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.style.display = 'block';
    
    // Populate recipient dropdown
    const recipientSelect = document.getElementById('message-recipient');
    recipientSelect.innerHTML = '<option value="">Select a user</option>';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            recipientSelect.appendChild(option);
        }
    });
}

async function sendMessage(event) {
    event.preventDefault();
    
    try {
        const toUserId = document.getElementById('message-recipient').value;
        const subject = document.getElementById('message-subject-input').value;
        const body = document.getElementById('message-body').value;
        
        await apiRequest('/messages', {
            method: 'POST',
            body: JSON.stringify({
                toUserId: parseInt(toUserId),
                subject,
                body
            })
        });
        
        closeModal('message-modal');
        alert('Message sent successfully!');
        
        // Clear form
        event.target.reset();
        
        // Reload messages
        await loadMessages();
        await loadNotifications();
    } catch (error) {
        console.error('Send message error:', error);
        alert('Failed to send message');
    }
}

// Notifications functions
async function loadNotifications() {
    try {
        const response = await apiRequest('/notifications');
        notifications = response;
        
        const notificationsList = document.getElementById('notifications-list');
        notificationsList.innerHTML = '';
        
        notifications.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });
        
        // Update notification count
        const unreadCount = notifications.filter(n => !n.isRead).length;
        document.getElementById('unread-notifications').textContent = unreadCount;
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.isRead ? '' : 'unread'}`;
    
    div.innerHTML = `
        <h4>${notification.title}</h4>
        <p>${notification.message}</p>
        <small>${new Date(notification.createdAt).toLocaleDateString()}</small>
        ${!notification.isRead ? `
            <button class="btn btn-primary btn-sm" onclick="markNotificationAsRead(${notification.id})">
                Mark as Read
            </button>
        ` : ''}
    `;
    
    return div;
}

async function markNotificationAsRead(notificationId) {
    try {
        await apiRequest(`/notifications/${notificationId}`, {
            method: 'PUT'
        });
        
        await loadNotifications();
    } catch (error) {
        console.error('Mark notification as read error:', error);
    }
}

async function markAllAsRead() {
    try {
        const unreadNotifications = notifications.filter(n => !n.isRead);
        
        for (const notification of unreadNotifications) {
            await apiRequest(`/notifications/${notification.id}`, {
                method: 'PUT'
            });
        }
        
        await loadNotifications();
    } catch (error) {
        console.error('Mark all as read error:', error);
    }
}

// Search functionality
async function searchUsers(event) {
    event.preventDefault();
    
    try {
        const searchTerm = document.getElementById('search-skill').value;
        const response = await apiRequest(`/search/users?skill=${encodeURIComponent(searchTerm)}`);
        
        const usersGrid = document.getElementById('users-grid');
        usersGrid.innerHTML = '';
        
        response.forEach(user => {
            const userCard = createUserCard(user);
            usersGrid.appendChild(userCard);
        });
    } catch (error) {
        console.error('Search users error:', error);
    }
}

function filterByCategory(category) {
    // This would be implemented with backend filtering
    console.log('Filter by category:', category);
    // For now, just reload all users
    loadUsers();
}

// Dashboard functions
function updateDashboard() {
    const user = currentUser;
    
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-location').textContent = user.location || 'Location not set';
    document.getElementById('profile-photo').src = user.photo || 'https://via.placeholder.com/120';
    
    // Update skills display
    const skillsContainer = document.getElementById('offered-skills');
    skillsContainer.innerHTML = user.skillsOffered.map(skill => 
        `<span class="skill-tag">${skill}</span>`
    ).join('');
    
    // Update stats
    const userRequests = swapRequests.filter(req => 
        req.fromUserId === user.id || req.toUserId === user.id
    );
    
    document.getElementById('total-swaps').textContent = user.totalSwaps || 0;
    document.getElementById('pending-requests').textContent = 
        userRequests.filter(req => req.status === 'pending').length;
    document.getElementById('rating').textContent = user.rating || '0.0';
    document.getElementById('unread-messages').textContent = 
        messages.filter(m => !m.isRead && m.toUserId === user.id).length;
    document.getElementById('unread-notifications').textContent = 
        notifications.filter(n => !n.isRead).length;
    
    // Update recent activity
    updateRecentActivity();
}

function updateRecentActivity() {
    const activityContainer = document.getElementById('recent-activity');
    const recentItems = [];
    
    // Add recent swap requests
    const recentRequests = swapRequests
        .filter(req => req.fromUserId === currentUser.id || req.toUserId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    recentRequests.forEach(request => {
        const otherUser = request.fromUserId === currentUser.id ? 
            users.find(u => u.id === request.toUserId) : 
            users.find(u => u.id === request.fromUserId);
        
        recentItems.push({
            type: 'swap_request',
            text: `${request.status === 'pending' ? 'Sent' : request.status} swap request to ${otherUser?.name}`,
            date: new Date(request.createdAt).toLocaleDateString()
        });
    });
    
    // Add recent messages
    const recentMessages = messages
        .filter(m => m.fromUserId === currentUser.id || m.toUserId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
    
    recentMessages.forEach(message => {
        const otherUser = message.fromUserId === currentUser.id ? 
            users.find(u => u.id === message.toUserId) : 
            users.find(u => u.id === message.fromUserId);
        
        recentItems.push({
            type: 'message',
            text: `${message.fromUserId === currentUser.id ? 'Sent' : 'Received'} message from ${otherUser?.name}`,
            date: new Date(message.createdAt).toLocaleDateString()
        });
    });
    
    // Display recent activity
    activityContainer.innerHTML = recentItems
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(item => `
            <div class="activity-item">
                <span class="activity-icon">
                    <i class="fas fa-${item.type === 'swap_request' ? 'exchange-alt' : 'envelope'}"></i>
                </span>
                <div class="activity-content">
                    <p>${item.text}</p>
                    <small>${item.date}</small>
                </div>
            </div>
        `).join('');
}

// Admin functions
async function loadAdminData() {
    if (currentUser.role !== 'admin') return;
    
    await Promise.all([
        loadUsersList(),
        loadSwapsList(),
        loadAdminAnalytics()
    ]);
}

function showAdminTab(tabName) {
    // Hide all admin content
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.add('d-none');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`admin-${tabName}`).classList.remove('d-none');
    event.target.classList.add('active');
}

async function loadUsersList() {
    try {
        const response = await apiRequest('/admin/users');
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        response.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'request-item';
            userDiv.innerHTML = `
                <div class="request-info">
                    <h4>${user.name}</h4>
                    <p>${user.location}</p>
                    <p>Role: ${user.role}</p>
                    <p>Status: ${user.isBanned ? 'Banned' : 'Active'}</p>
                </div>
                <div class="request-actions">
                    ${!user.isBanned ? `
                        <button class="btn btn-danger" onclick="banUser(${user.id})">Ban User</button>
                    ` : `
                        <button class="btn btn-success" onclick="unbanUser(${user.id})">Unban User</button>
                    `}
                </div>
            `;
            usersList.appendChild(userDiv);
        });
    } catch (error) {
        console.error('Load users list error:', error);
    }
}

async function loadSwapsList() {
    try {
        const response = await apiRequest('/swap-requests');
        const swapsList = document.getElementById('swaps-list');
        swapsList.innerHTML = '';
        
        response.forEach(request => {
            const swapDiv = document.createElement('div');
            swapDiv.className = 'request-item';
            swapDiv.innerHTML = `
                <div class="request-info">
                    <h4>${request.fromUser.name} → ${request.toUser.name}</h4>
                    <p>Status: ${request.status}</p>
                    <p>Date: ${new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
            `;
            swapsList.appendChild(swapDiv);
        });
    } catch (error) {
        console.error('Load swaps list error:', error);
    }
}

async function loadAdminAnalytics() {
    try {
        const response = await apiRequest('/admin/analytics');
        
        document.getElementById('total-users').textContent = response.totalUsers;
        document.getElementById('total-swaps-admin').textContent = response.totalSwaps;
        document.getElementById('active-users').textContent = response.activeUsers;
        document.getElementById('success-rate').textContent = 
            response.totalSwaps > 0 ? 
            Math.round((response.completedSwaps / response.totalSwaps) * 100) + '%' : '0%';
    } catch (error) {
        console.error('Load admin analytics error:', error);
    }
}

async function banUser(userId) {
    try {
        if (confirm('Are you sure you want to ban this user?')) {
            await apiRequest(`/admin/users/${userId}/ban`, {
                method: 'PUT'
            });
            
            await loadUsersList();
        }
    } catch (error) {
        console.error('Ban user error:', error);
        alert('Failed to ban user');
    }
}

async function unbanUser(userId) {
    try {
        if (confirm('Are you sure you want to unban this user?')) {
            await apiRequest(`/admin/users/${userId}/unban`, {
                method: 'PUT'
            });
            
            await loadUsersList();
        }
    } catch (error) {
        console.error('Unban user error:', error);
        alert('Failed to unban user');
    }
}

async function downloadReport(type) {
    try {
        const response = await apiRequest(`/admin/reports/${type}`);
        
        // Create and download file
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download report error:', error);
        alert('Failed to download report');
    }
}

async function sendPlatformMessage(event) {
    event.preventDefault();
    
    try {
        const subject = document.getElementById('message-subject').value;
        const content = document.getElementById('message-content').value;
        
        await apiRequest('/admin/messages', {
            method: 'POST',
            body: JSON.stringify({
                subject,
                content
            })
        });
        
        alert('Platform message sent successfully!');
        event.target.reset();
    } catch (error) {
        console.error('Send platform message error:', error);
        alert('Failed to send platform message');
    }
}

// Real-time updates
function setupRealTimeUpdates() {
    // Poll for updates every 30 seconds
    setInterval(async () => {
        try {
            await Promise.all([
                loadNotifications(),
                loadMessages(),
                loadSwapRequests()
            ]);
            
            updateDashboard();
        } catch (error) {
            console.error('Real-time update error:', error);
        }
    }, 30000);
}

// Utility functions
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Export functions for global access
window.showSection = showSection;
window.openUserModal = openUserModal;
window.closeModal = closeModal;
window.sendSwapRequest = sendSwapRequest;
window.respondToRequest = respondToRequest;
window.deleteRequest = deleteRequest;
window.searchUsers = searchUsers;
window.filterByCategory = filterByCategory;
window.addSkill = addSkill;
window.removeSkill = removeSkill;
window.updateProfile = updateProfile;
window.openNewMessageModal = openNewMessageModal;
window.sendMessage = sendMessage;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllAsRead = markAllAsRead;
window.showAdminTab = showAdminTab;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.downloadReport = downloadReport;
window.sendPlatformMessage = sendPlatformMessage;
window.logout = logout;
