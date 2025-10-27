// State Management (In-Memory + LocalStorage)
let appState = {
  bucketListItems: [],
  currentTheme: 'light',
  timezone: 'Asia/Kolkata'
};

// Category icons mapping
const categoryIcons = {
  travel: '🌍',
  food: '🍔',
  clothes: '👚',
  experiences: '🎉',
  books: '📚',
  wellness: '🧘',
  tech: '💻',
  movies: '🎬',
  finance: '💸',
  misc: '📝'
};

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem('bucketListState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
    } catch (err) {
      console.error('Failed to load saved state:', err);
    }
  }
}

// Save state to localStorage
function saveState() {
  try {
    localStorage.setItem('bucketListState', JSON.stringify(appState));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

// Initialize app
function initApp() {
  loadState();
  loadTheme();
  setupEventListeners();
  renderItems();
  updateItemCount();
  setDefaultDateTime();
}

// Theme Management
function loadTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (appState.currentTheme === 'dark' || prefersDark) {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    themeToggle.querySelector('.theme-icon').textContent = '☀️';
    appState.currentTheme = 'dark';
  } else {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    themeToggle.querySelector('.theme-icon').textContent = '🌙';
    appState.currentTheme = 'light';
  }
  saveState();
}

function toggleTheme() {
  appState.currentTheme = appState.currentTheme === 'light' ? 'dark' : 'light';
  loadTheme();
}

// Event Listeners
function setupEventListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
}

// Date & Time Management
function setDefaultDateTime() {
  const now = new Date();
  const istDate = getISTDateTime(now);
  const dateTimeInput = document.getElementById('itemDateTime');
  dateTimeInput.value = formatDateTimeForInput(istDate);
}

function getISTDateTime(date = new Date()) {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  return new Date(utcTime + istOffset);
}

function formatDateTimeForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTimestamp(date) {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-IN', options);
}

// Add Item
function handleAddItem(e) {
  e.preventDefault();
  
  const title = document.getElementById('itemTitle').value.trim();
  const category = document.getElementById('itemCategory').value;
  const description = document.getElementById('itemDescription').value.trim();
  const dateTimeValue = document.getElementById('itemDateTime').value;
  
  if (!title || !category) {
    alert('Please fill in the title and category!');
    return;
  }
  
  const scheduledDate = dateTimeValue ? new Date(dateTimeValue) : null;
  const createdAt = getISTDateTime();
  const selectedUser = document.getElementById('userSelect').value;
  
  const newItem = {
    id: Date.now(),
    title,
    category,
    description,
    scheduledDate: scheduledDate ? scheduledDate.toISOString() : null,
    completed: false,
    createdAt: createdAt.toISOString(),
    createdBy: selectedUser
  };
  
  appState.bucketListItems.unshift(newItem);
  saveState();
  
  document.getElementById('addItemForm').reset();
  setDefaultDateTime();
  renderItems();
  updateItemCount();
  showNotification('Item added successfully! 🎉');
}

// Toggle Item Completion
function toggleItemCompletion(itemId) {
  const item = appState.bucketListItems.find(i => i.id === itemId);
  if (item) {
    item.completed = !item.completed;
    saveState();
    
    if (item.completed) {
      triggerCelebration();
    }
    
    renderItems();
    updateItemCount();
  }
}

// Delete Item
function deleteItem(itemId) {
  if (confirm('Are you sure you want to delete this item?')) {
    appState.bucketListItems = appState.bucketListItems.filter(i => i.id !== itemId);
    saveState();
    renderItems();
    updateItemCount();
    showNotification('Item deleted');
  }
}

// Render Items
function renderItems() {
  const container = document.getElementById('itemsContainer');
  const emptyState = document.getElementById('emptyState');
  
  if (appState.bucketListItems.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  const itemsHTML = appState.bucketListItems.map(item => {
    const icon = categoryIcons[item.category] || '📝';
    const createdDate = new Date(item.createdAt);
    const scheduledDate = item.scheduledDate ? new Date(item.scheduledDate) : null;
    
    return `
      <div class="bucket-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
        <div class="item-content">
          <div class="item-header">
            <span class="item-category">${icon} ${item.category}</span>
            <div class="toggle-container">
              <label class="toggle-switch">
                <input type="checkbox" ${item.completed ? 'checked' : ''} 
                  onchange="toggleItemCompletion(${item.id})">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <h3 class="item-title">${escapeHtml(item.title)}</h3>
          
          ${item.description ? `
            <p class="item-description">${escapeHtml(item.description)}</p>
          ` : ''}
          
          <div class="item-meta">
            <span class="meta-item">
              <small>Created: ${formatTimestamp(createdDate)}</small>
            </span>
            ${scheduledDate ? `
              <span class="meta-item">
                <small>Scheduled: ${formatTimestamp(scheduledDate)}</small>
              </span>
            ` : ''}
            <span class="meta-item">
              <small>By: ${escapeHtml(item.createdBy)}</small>
            </span>
          </div>
          
          <div class="item-actions">
            <button class="action-btn delete" onclick="deleteItem(${item.id})">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = itemsHTML;
}

// Update Item Count
function updateItemCount() {
  const total = appState.bucketListItems.length;
  const completed = appState.bucketListItems.filter(i => i.completed).length;
  const countEl = document.getElementById('itemCount');
  countEl.textContent = `${completed}/${total} completed`;
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.5s forwards';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Celebration Animation
function triggerCelebration() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);
    
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    }));
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    }));
  }, 250);
}

// CSV Download
function downloadCSV() {
  if (appState.bucketListItems.length === 0) {
    showNotification('No items to download.');
    return;
  }

  const header = ['Title','Category','Description','Scheduled Date','Completed','Created At','Created By'];
  const csvRows = [header.join(',')];

  appState.bucketListItems.forEach(item => {
    const row = [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${item.scheduledDate ? new Date(item.scheduledDate).toLocaleString() : ''}"`,
      `"${item.completed ? 'Yes' : 'No'}"`,
      `"${new Date(item.createdAt).toLocaleString()}"`,
      `"${item.createdBy}"`
    ].join(',');
    csvRows.push(row);
  });

  const csvContent = csvRows.join('\n') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bucket_list.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}