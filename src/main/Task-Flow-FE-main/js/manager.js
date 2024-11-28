document.addEventListener('DOMContentLoaded', function() {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
    if (!userInfo.accessToken) {
        window.location.href = 'sign-in.html';
        return;
    }
    loadUserInfo();
    loadTasks();

    document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);
    document.getElementById('statusFilter').addEventListener('change', filterTasks);
    document.getElementById('priorityFilter').addEventListener('change', filterTasks);

    // Thêm event listener cho thanh tìm kiếm
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');

    // Xử lý sự kiện khi nhấn nút tìm kiếm
    searchBtn.addEventListener('click', function() {
        const keyword = searchInput.value.trim();
        loadTasks(keyword);
    });

    // Xử lý sự kiện khi nhấn Enter trong ô tìm kiếm
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const keyword = searchInput.value.trim();
            loadTasks(keyword);
        }
    });

    // Event listener cho form tạo công việc
    document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);
    
    // Đóng modal khi click bên ngoài
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('addTaskModal');
        if (event.target === modal) {
            closeAddTaskForm();
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const token = checkAndGetToken();
    if (token) {
        loadTasks();
    }
});

function setupTaskClickHandlers() {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        item.addEventListener('click', () => {
            const taskId = item.getAttribute('data-task-id');
            if (taskId) {
                viewTaskDetail(taskId);
            } else {
                console.error('Task ID is missing');
            }
        });
    });
}

// Gọi hàm setupTaskClickHandlers sau khi load danh sách task
document.addEventListener('DOMContentLoaded', () => {
    setupTaskClickHandlers();
});

// Thêm hàm checkAndGetToken
function checkAndGetToken() {
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        console.log('Current userInfo:', userInfo);

        if (!userInfo.accessToken) {
            showNotification('Vui lòng đăng nhập lại', 'error');
            window.location.href = 'sign-in.html';
            return null;
        }
        return userInfo.accessToken;
    } catch (error) {
        console.error('Error checking token:', error);
        return null;
    }
}

async function handleAddTask(e) {
    e.preventDefault();
    
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
    if (!userInfo.accessToken) {
        showNotification('Vui lòng đăng nhập trước', 'error');
        window.location.href = 'sign-in.html';
        return;
    }

    const task = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        date: document.getElementById('taskDueDate').value,
        priority: getPriorityValue(document.getElementById('taskPriority').value),
        status: 0,
        user_id: userInfo.userId
    };

    try {
        console.log('Sending task data:', task);

        const response = await fetch('http://localhost:8080/api/v1/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.accessToken}`
            },
            body: JSON.stringify(task)
        });

        if (response.status === 401) {
            sessionStorage.removeItem('userInfo');
            showNotification('Phiên đăng nhập hết hạn', 'error');
            window.location.href = 'sign-in.html';
            return;
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.status === 200) {
            showNotification('Tạo công việc mới thành công!', 'success');
            closeAddTaskForm();
            
            // Thêm task mới vào container
            const tasksContainer = document.getElementById('tasksContainer');
            const newTaskElement = createTaskElement(task);
            
            // Thêm vào đầu danh sách
            if (tasksContainer.firstChild) {
                tasksContainer.insertBefore(newTaskElement, tasksContainer.firstChild);
            } else {
                tasksContainer.appendChild(newTaskElement);
            }
        } else {
            showNotification(data.message || 'Không thể tạo công việc', 'error');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        showNotification('Có lỗi xảy ra khi tạo công việc', 'error');
    }
}

async function loadTasks() {
    const token = checkToken();
    if (!token) return;

    try {
        const response = await fetch('http://localhost:8080/api/v1/tasks?keyword=', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept-Language': 'vi'
            }
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();
        if (data.status === 200) {
            displayTasks(data.data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Lỗi khi tải danh sách công việc', 'error');
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + userInfo.accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showNotification('Cập nhật trạng thái thành công', 'success');
            await loadTasks();
        } else {
            throw new Error('Không thể cập nhật trạng thái');
        }
    } catch (error) {
        console.error('Update status error:', error);
        showNotification('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    }
}

async function deleteTask(taskId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
            return;
        }

        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Accept-Language': 'vi',
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();
        
        if (data.status === 200) {
            showNotification('Xóa công việc thành công', 'success');
            // Reload danh sách task
            await loadTasks();
        } else {
            showNotification(data.message || 'Lỗi khi xóa công việc', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Lỗi khi xóa công việc', 'error');
    }
}

async function getTaskDetails(taskId) {
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'language': 'en'
            }
        });

        const data = await response.json();
        if (data.status_code === 200) {
            return data.data;
        }
        throw new Error(data.message || 'Failed to get task details');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error getting task details', 'error');
        throw error;
    }
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';
    
    // Xác định màu dựa trên priority
    let priorityColor;
    switch(task.priority) {
        case 2: priorityColor = '#ff4444'; break; // High
        case 1: priorityColor = '#ffbb33'; break; // Medium
        default: priorityColor = '#00C851'; break; // Low
    }

    taskDiv.innerHTML = `
        <div class="task-header" style="border-left: 4px solid ${priorityColor}">
            <h3 class="task-title">${task.title}</h3>
            <span class="task-date">${formatDate(task.date)}</span>
        </div>
        <div class="task-content">
            <p class="task-description">${task.description}</p>
            <div class="task-info">
                <span class="task-priority priority-${getPriorityLabel(task.priority).toLowerCase()}">
                    ${getPriorityLabel(task.priority)}
                </span>
                <span class="task-status status-${task.status === 1 ? 'completed' : 'pending'}">
                    ${task.status === 1 ? 'Hoàn thành' : 'Đang thực hiện'}
                </span>
            </div>
        </div>
    `;

    // Thêm sự kiện click
    taskDiv.addEventListener('click', () => {
        window.location.href = `task-detail.html?id=${task.id}`;
    });

    return taskDiv;
}

document.head.insertAdjacentHTML('beforeend', `
    <style>
    .task-item {
        background: white;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        animation: slideIn 0.5s ease-out;
    }
    
    .task-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-left: 10px;
    }
    
    .task-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0;
    }
    
    .task-date {
        font-size: 12px;
        color: #666;
    }
    
    .task-description {
        font-size: 14px;
        color: #666;
        margin: 10px 0;
        line-height: 1.4;
    }
    
    .task-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
    }
    
    .task-priority, .task-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .priority-high {
        background: #ffe0e0;
        color: #d32f2f;
    }
    
    .priority-medium {
        background: #fff3e0;
        color: #f57c00;
    }
    
    .priority-low {
        background: #e8f5e9;
        color: #388e3c;
    }
    
    .status-pending {
        background: #fff3e0;
        color: #f57c00;
    }
    
    .status-completed {
        background: #e8f5e9;
        color: #388e3c;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
`);

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}
// Helper functions
function getPriorityLabel(priority) {
    switch(priority) {
        case 2: return 'High';
        case 1: return 'Medium';
        default: return 'Low';
    }
}

function getPriorityValue(label) {
    switch(label.toLowerCase()) {
        case 'high': return 2;
        case 'medium': return 1;
        default: return 0;
    }
}

function showNotification(message, type = 'info') {
    // Xóa thông báo cũ nếu có
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Tạo thông báo mới với nội dung đơn giản
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Đặt nội dung text trực tiếp
    notification.textContent = message;

    // Thêm vào body
    document.body.appendChild(notification);

    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// CSS đơn giản hơn
document.head.insertAdjacentHTML('beforeend', `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    min-width: 300px;
    animation: slideIn 0.5s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.notification.success { 
    border: 2px solid #4CAF50;
    color: white; /* Đổi màu chữ thành trắng */
}

.notification.error { 
    border: 2px solid #f44336;
    color: white; /* Đổi màu chữ thành trắng */
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
`);

async function loadUserInfo() {
    // Lấy thông tin user từ localStorage
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
    const userName = userInfo.userName || 'User';
    const userAvatar = localStorage.getItem('userAvatar') || '../assets/images/userdefault.png';

    // Cập nhật tên user
    const userNameElements = document.querySelectorAll('.user-name-info');
    userNameElements.forEach(element => {
        element.textContent = userName;
    });

    // Cập nhật avatar
    const avatarElements = document.querySelectorAll('.admin-main-avatar, .user-pics-info');
    avatarElements.forEach(element => {
        element.src = userAvatar;
    });
}

function toggleMenu() {
    const submenu = document.getElementById('Submenu');
    if (submenu) {
        submenu.classList.toggle('open-wrap');
    }
}

// Trong hàm logout
function logout() {
    sessionStorage.clear();
    window.location.href = 'sign-in.html';
}

window.addEventListener('storage', function(e) {
    if (e.key === 'userName' || e.key === 'userAvatar') {
        loadUserInfo();
    }
});

// Thêm các hàm mới để xử lý modal và form tạo công việc
function showAddTaskForm() {
    const modal = document.getElementById('addTaskModal');
    modal.style.display = 'block';
    
    // Reset form
    document.getElementById('addTaskForm').reset();
    
    // Set default date là ngày hôm nay
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDueDate').value = today;
}

function closeAddTaskForm() {
    const modal = document.getElementById('addTaskModal');
    modal.style.display = 'none';
}

// Thêm CSS cho modal
document.head.insertAdjacentHTML('beforeend', `
<style>
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.modal-content {
    position: relative;
    background-color: #fff;
    margin: 10% auto;
    padding: 20px;
    width: 50%;
    max-width: 500px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.close {
    position: absolute;
    right: 20px;
    top: 10px;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.form-group textarea {
    height: 100px;
    resize: vertical;
}

.submit-btn {
    background-color: #4CAF50;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
}

.submit-btn:hover {
    background-color: #45a049;
}
</style>
`);

// Hàm mở modal chỉnh sửa và lấy thông tin task
function editTask(taskId) {
    // Chuyển hướng đến trang chi tiết task với taskId trong URL
    window.location.href = `task-detail.html?id=${encodeURIComponent(taskId)}`;
}

// Hàm xử lý cập nhật task
async function handleEditTask(event) {
    event.preventDefault();
    
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const taskId = document.getElementById('editTaskId').value;
        
        // Tạo object chứa thông tin cập nhật
        const updatedTask = {
            title: document.getElementById('editTaskTitle').value,
            description: document.getElementById('editTaskDescription').value,
            date: document.getElementById('editTaskDueDate').value,
            priority: parseInt(document.getElementById('editTaskPriority').value),
            status: 0
        };

        console.log('Updating task:', updatedTask); // Debug log

        // Gửi yêu cầu cập nhật lên server
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedTask)
        });

        const data = await response.json();
        console.log('Update response:', data); // Debug log

        if (data.status === 200) {
            showNotification('Cập nhật công việc thành công', 'success');
            closeEditModal();
            
            // Cập nhật lại giao diện
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                // Cập nhật nội dung của task trong DOM
                taskElement.querySelector('.task-title').textContent = updatedTask.title;
                taskElement.querySelector('.task-description').textContent = updatedTask.description;
                taskElement.querySelector('.task-date').textContent = formatDate(updatedTask.date);
                
                // Cập nhật priority
                const priorityElement = taskElement.querySelector('.task-priority');
                priorityElement.className = `task-priority priority-${getPriorityLabel(updatedTask.priority).toLowerCase()}`;
                priorityElement.textContent = getPriorityLabel(updatedTask.priority);
            }
            
            // Tải lại danh sách task để cập nhật mọi thay đổi
            await loadTasks();
        } else {
            showNotification('Lỗi khi cập nhật công việc', 'error');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Có lỗi xảy ra khi cập nhật công việc', 'error');
    }
}

// Hàm đóng modal
function closeEditModal() {
    const modal = document.getElementById('editTaskModal');
    modal.style.display = 'none';
}

// Thêm event listener để đóng modal khi click bên ngoài
window.addEventListener('click', function(event) {
    const modal = document.getElementById('editTaskModal');
    if (event.target === modal) {
        closeEditModal();
    }
});

// Thêm hàm filterTasks
function filterTasks() {
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    
    const taskElements = document.querySelectorAll('.task-item');
    taskElements.forEach(taskElement => {
        const taskStatus = taskElement.querySelector('.status').textContent.toLowerCase();
        const taskPriority = taskElement.querySelector('.priority').textContent.toLowerCase();
        const taskTitle = taskElement.querySelector('.task-title').textContent.toLowerCase();
        
        const matchesStatus = status === 'all' || taskStatus.includes(status);
        const matchesPriority = priority === 'all' || taskPriority.includes(priority);
        const matchesKeyword = keyword === '' || taskTitle.includes(keyword);
        
        taskElement.style.display = matchesStatus && matchesPriority && matchesKeyword ? 'block' : 'none';
    });
}

// Cập nhật hàm displayTasks để hiển thị tasks
function displayTasks(tasks) {
    const taskList = document.getElementById('taskList');
    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<p class="no-tasks">Không có công việc nào.</p>';
        return;
    }

    taskList.innerHTML = tasks.map(task => `
        <div class="task-item" data-task-id="${task.id}">
            <div class="task-header">
                <h3>${task.title}</h3>
                <div class="task-actions">
                    <span class="task-status ${task.status === 1 ? 'completed' : 'pending'}">
                        ${task.status === 1 ? 'Hoàn thành' : 'Đang thực hiện'}
                    </span>
                    <button class="edit-btn" onclick="event.stopPropagation(); editTask('${task.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="task-description">${task.description}</p>
            <div class="task-metadata">
                <span class="task-date">${formatDate(task.date)}</span>
                <span class="task-priority priority-${getPriorityLabel(task.priority).toLowerCase()}">
                    ${getPriorityLabel(task.priority)}
                </span>
            </div>
        </div>
    `).join('');

    // Thêm event listeners cho các task items
    document.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
                const taskId = this.getAttribute('data-task-id');
                if (taskId) {
                    viewTaskDetail(taskId);
                }
            }
        });
    });
}

function viewTaskDetail(taskId) {
    if (!taskId) {
        console.error('Invalid task ID');
        showNotification('Không thể xem chi tiết công việc', 'error');
        return;
    }

    // Lưu taskId vào sessionStorage
    sessionStorage.setItem('currentTaskId', taskId);
    console.log('Navigating to task detail with ID:', taskId); // Debug log
    
    // Chuyển hướng đến trang chi tiết
    window.location.href = `task-detail.html?id=${encodeURIComponent(taskId)}`;
}

// Thêm CSS cho thông báo không có tasks
document.head.insertAdjacentHTML('beforeend', `
    <style>
    .tasks-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px;
        margin-top: 20px;
    }
    
    .task-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 15px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .task-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-left: 10px;
    }
    
    .task-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0;
    }
    
    .task-date {
        font-size: 12px;
        color: #666;
    }
    
    .task-description {
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .task-status {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .task-status.pending {
        background-color: #fff3cd;
        color: #856404;
    }
    
    .task-status.completed {
        background-color: #d4edda;
        color: #155724;
    }
    </style>
`);   

// Thêm CSS cho notification
document.head.insertAdjacentHTML('beforeend', `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    animation: slideIn 0.5s ease-out;
}

.notification.success { background-color: #4CAF50; }
.notification.error { background-color: #f44336; }
.notification.info { background-color: #2196F3; }

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
`);

function setupTaskClickHandlers() {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        item.addEventListener('click', () => {
            const taskId = item.getAttribute('data-task-id');
            if (taskId) {
                viewTaskDetail(taskId);
            } else {
                console.error('Task ID is missing');
            }
        });
    });
}

// Gọi hàm setupTaskClickHandlers sau khi load danh sách task
document.addEventListener('DOMContentLoaded', () => {
    setupTaskClickHandlers();
});

function checkToken() {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
    if (!userInfo.accessToken) {
        handleUnauthorized();
        return false;
    }
    return userInfo.accessToken;
}