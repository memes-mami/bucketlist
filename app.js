// State Management (In-Memory)
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

// Initialize app
function initApp() {
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
    appState.currentTheme = 'dark';
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.querySelector('.theme-icon').textContent = '☀️';
  } else {
    appState.currentTheme = 'light';
    document.body.setAttribute('data-theme', 'light');
    themeToggle.querySelector('.theme-icon').textContent = '🌙';
  }
}

function toggleTheme() {
  const themeToggle = document.getElementById('themeToggle');
  
  if (appState.currentTheme === 'light') {
    appState.currentTheme = 'dark';
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.querySelector('.theme-icon').textContent = '☀️';
  } else {
    appState.currentTheme = 'light';
    document.body.setAttribute('data-theme', 'light');
    themeToggle.querySelector('.theme-icon').textContent = '🌙';
  }
}

// Event Listeners
function setupEventListeners() {
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Form submission
  document.getElementById('addItemForm').addEventListener('submit', handleAddItem);

  // CSV download
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
  // Convert to IST (UTC+5:30)
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000; // IST is UTC+5:30
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
  // Save to remote CSV in GitHub via Vercel serverless function
  saveItemToCsv(newItem).catch(err => {
    console.error('Failed to save CSV remotely:', err);
    showNotification('Saved locally but failed to persist to GitHub CSV.');
  });
  
  // Reset form
  document.getElementById('addItemForm').reset();
  setDefaultDateTime();
  
  // Update UI
  renderItems();
  updateItemCount();
  
  // Show success feedback
  showNotification('Item added successfully! 🎉');
}
// Add this new function near utilities (end of file)
async function saveItemToCsv(item) {
  const resp = await fetch('/api/save-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown' }));
    throw new Error(err && err.error ? err.error : 'Failed to save CSV');
  }
  const data = await resp.json();
  showNotification('Item saved to GitHub CSV.');
  return data;
}
// Toggle Item Completion
function toggleItemCompletion(itemId) {
  const item = appState.bucketListItems.find(i => i.id === itemId);
  if (item) {
    item.completed = !item.completed;
    
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
    renderItems();
    updateItemCount();
    showNotification('Item deleted');
  }
}

// Celebration Animation
function triggerCelebration() {
  // Canvas confetti animation
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
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

// Render Items
function renderItems() {
  const container = document.getElementById('itemsContainer');
  const emptyState = document.getElementById('emptyState');
  
  if (appState.bucketListItems.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  const itemsHTML = appState.bucketListItems.map(item => {
    const icon = categoryIcons[item.category] || '📝';
    const createdDate = new Date(item.createdAt);
    const scheduledDate = item.scheduledDate ? new Date(item.scheduledDate) : null;
    
    return `
      <div class="bucket-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
        <div class="toggle-container">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              ${item.completed ? 'checked' : ''}
              onchange="toggleItemCompletion(${item.id})"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="item-content">
          <div class="item-header">
            <span class="item-category">${icon}</span>
            <h3 class="item-title">${escapeHtml(item.title)}</h3>
          </div>
          
          ${item.description ? `<p class="item-description">${escapeHtml(item.description)}</p>` : ''}
          
          <div class="item-meta">
            <span class="meta-item">
              <span>📅</span>
              <span>Added: ${formatTimestamp(createdDate)}</span>
            </span>
            ${scheduledDate ? `
              <span class="meta-item">
                <span>⏰</span>
                <span>Scheduled: ${formatTimestamp(scheduledDate)}</span>
              </span>
            ` : ''}
            <span class="meta-item">
              <span>👤</span>
              <span>${escapeHtml(item.createdBy)}</span>
            </span>
          </div>
        </div>
        
        <div class="item-actions">
          <button class="action-btn delete" onclick="deleteItem(${item.id})" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = itemsHTML;
}

// Update Item Count
function updateItemCount() {
  const count = appState.bucketListItems.length;
  const completedCount = appState.bucketListItems.filter(i => i.completed).length;
  document.getElementById('itemCount').textContent = 
    `${count} item${count !== 1 ? 's' : ''} (${completedCount} completed)`;
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  // Simple notification (you can enhance this)
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--color-success);
    color: var(--color-btn-primary-text);
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification animations
const styleElem = document.createElement('style');
styleElem.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(styleElem);

// CSV Download
function downloadCSV() {
  if (appState.bucketListItems.length === 0) {
    showNotification('No items to download.');
    return;
  }
  let csvContent = 'Title,Category,Description,Scheduled Date,Completed,Created At,Created By\n';
  appState.bucketListItems.forEach(item => {
    const title = item.title.replace(/"/g, '""');
    const category = item.category;
    const description = item.description.replace(/"/g, '""');
    const scheduled = item.scheduledDate ? new Date(item.scheduledDate).toLocaleString() : '';
    const completed = item.completed ? 'Yes' : 'No';
    const createdAt = new Date(item.createdAt).toLocaleString();
    const createdBy = item.createdBy.replace(/"/g, '""');
    csvContent += `"${title}","${category}","${description}","${scheduled}",${completed},"${createdAt}","${createdBy}"\n`;
  });
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

// Simulate real-time updates (for demo purposes)
// In production, you would use WebSockets or a real-time database
function simulateRealTimeUpdates() {
  // This would be replaced with actual WebSocket or Firebase listeners
  setInterval(() => {
    // Check for updates from other users
    // For now, this is just a placeholder
  }, 5000);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_TOKEN,
    CSV_PATH = 'data/bucket_list.csv',
    BRANCH = 'main'
  } = process.env;

  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    res.status(500).json({ error: 'Missing GitHub configuration in environment' });
    return;
  }

  const item = req.body;
  if (!item || !item.title) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  // Helper to CSV-escape a field
  function csvEscape(field) {
    if (field === null || field === undefined) return '';
    return `"${String(field).replace(/"/g, '""')}"`;
  }

  const row = [
    csvEscape(item.title),
    csvEscape(item.category),
    csvEscape(item.description || ''),
    csvEscape(item.scheduledDate ? new Date(item.scheduledDate).toLocaleString() : ''),
    csvEscape(item.completed ? 'Yes' : 'No'),
    csvEscape(item.createdAt ? new Date(item.createdAt).toLocaleString() : ''),
    csvEscape(item.createdBy || '')
  ].join(',') + '\n';

  const apiBase = 'https://api.github.com';
  const fileUrl = `${apiBase}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(CSV_PATH)}?ref=${encodeURIComponent(BRANCH)}`;

  try {
    // Try to fetch existing file to get SHA and current content
    const getResp = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });

    let newContent;
    let sha;

    if (getResp.status === 200) {
      const data = await getResp.json();
      sha = data.sha;
      const existing = Buffer.from(data.content, 'base64').toString('utf8');
      newContent = existing + row;
    } else if (getResp.status === 404) {
      // File doesn't exist — create with header + row
      const header = 'Title,Category,Description,Scheduled Date,Completed,Created At,Created By\n';
      newContent = header + row;
    } else {
      const errText = await getResp.text();
      throw new Error(`Failed fetching file: ${getResp.status} ${errText}`);
    }

    const putUrl = `${apiBase}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(CSV_PATH)}`;

    const putBody = {
      message: `Update bucket list CSV: add "${item.title}"`,
      content: Buffer.from(newContent, 'utf8').toString('base64'),
      branch: BRANCH
    };
    if (sha) putBody.sha = sha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putResp.ok) {
      const errJson = await putResp.json().catch(() => ({}));
      throw new Error(`GitHub update failed: ${putResp.status} ${JSON.stringify(errJson)}`);
    }

    const result = await putResp.json();
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
}