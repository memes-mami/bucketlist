let appState = {
  bucketListItems: [],
  currentTheme: 'light',
  timezone: 'Asia/Kolkata'
};

// Firebase reference
const db = firebase.database();
const bucketListRef = db.ref('bucketList');

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

function initApp() {
  loadTheme();
  setupEventListeners();
  setupFirebaseListeners();
  setDefaultDateTime();
}

// Setup Firebase Realtime Listeners
function setupFirebaseListeners() {
  bucketListRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    appState.bucketListItems = Object.entries(data)
      .map(([key, item]) => ({ ...item, _key: key }))
      .sort((a, b) => b.id - a.id);
    renderItems();
    updateItemCount();
  });
}

// Theme Management
function loadTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (appState.currentTheme === 'dark' || prefersDark) {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    if (themeToggle && themeToggle.querySelector('.theme-icon')) {
      themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }
    appState.currentTheme = 'dark';
  } else {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    if (themeToggle && themeToggle.querySelector('.theme-icon')) {
      themeToggle.querySelector('.theme-icon').textContent = '🌙';
    }
    appState.currentTheme = 'light';
  }
}

function toggleTheme() {
  appState.currentTheme = appState.currentTheme === 'light' ? 'dark' : 'light';
  loadTheme();
}

// Event Listeners
function setupEventListeners() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  const addItemForm = document.getElementById('addItemForm');
  if (addItemForm) {
    addItemForm.addEventListener('submit', handleAddItem);
  }
}

// Date & Time Management
function setDefaultDateTime() {
  const now = new Date();
  const istDate = getISTDateTime(now);
  const dateTimeInput = document.getElementById('itemDateTime');
  if (dateTimeInput) {
    dateTimeInput.value = formatDateTimeForInput(istDate);
  }
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

  const titleEl = document.getElementById('itemTitle');
  const categoryEl = document.getElementById('itemCategory');
  const descriptionEl = document.getElementById('itemDescription');
  const dateTimeEl = document.getElementById('itemDateTime');
  const userSelectEl = document.getElementById('userSelect');

  const title = titleEl ? titleEl.value.trim() : '';
  const category = categoryEl ? categoryEl.value : '';
  const description = descriptionEl ? descriptionEl.value.trim() : '';
  const dateTimeValue = dateTimeEl ? dateTimeEl.value : '';
  const selectedUser = userSelectEl ? userSelectEl.value : '';

  if (!title || !category) {
    alert('Please fill in the title and category!');
    return;
  }

  const scheduledDate = dateTimeValue ? new Date(dateTimeValue) : null;
  const createdAt = getISTDateTime();

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

  bucketListRef.push(newItem)
    .then(() => {
      if (document.getElementById('addItemForm')) {
        document.getElementById('addItemForm').reset();
      }
      setDefaultDateTime();
      showNotification('Item added successfully! 🎉');
    })
    .catch(error => {
      console.error('Error saving item:', error);
      showNotification('Failed to save item!');
    });
}

// Toggle Item Completion
function toggleItemCompletion(firebaseKey, currentCompleted) {
  bucketListRef.child(firebaseKey).update({ completed: !currentCompleted })
    .then(() => {
      if (!currentCompleted) triggerCelebration();
    })
    .catch(error => {
      console.error('Error updating item:', error);
      showNotification('Failed to update item!');
    });
}

// Delete Item
function deleteItem(firebaseKey) {
  if (confirm('Are you sure you want to delete this item?')) {
    bucketListRef.child(firebaseKey).remove()
      .then(() => {
        showNotification('Item deleted');
      })
      .catch(error => {
        console.error('Error deleting item:', error);
        showNotification('Failed to delete item!');
      });
  }
}

// Render Items
function renderItems() {
  const container = document.getElementById('itemsContainer');
  const emptyState = document.getElementById('emptyState');

  if (!container || !emptyState) return;

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
      <div class="bucket-item ${item.completed ? 'completed' : ''}" data-id="${item._key}">
        <div class="item-content">
          <div class="item-header">
            <span class="item-category">${icon} ${item.category}</span>
            <div class="toggle-container">
              <label class="toggle-switch">
                <input type="checkbox" ${item.completed ? 'checked' : ''} 
                  onchange="toggleItemCompletion('${item._key}', ${item.completed})">
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
            <button class="action-btn delete" onclick="deleteItem('${item._key}')">
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
  if (countEl) {
    countEl.textContent = `${completed}/${total} completed`;
  }
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

// Expose functions for inline event handlers
window.toggleItemCompletion = toggleItemCompletion;
window.deleteItem = deleteItem;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}