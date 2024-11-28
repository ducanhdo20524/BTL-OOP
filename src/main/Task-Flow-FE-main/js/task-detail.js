document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');

    // Nút quay lại
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = 'manager.html';
    });

    // Nút chỉnh sửa
    document.getElementById('editButton').addEventListener('click', () => {
        const modal = document.getElementById('editModal');
        modal.style.display = 'block';
    });

    // Đóng modal
    document.querySelector('.close').addEventListener('click', closeEditModal);
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeEditModal();
        }
    });

    // Form submit
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);

    if (taskId) {
        await loadTaskDetails(taskId);
        await loadComments(taskId);
    }

    const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
    if (userInfo) {
        document.getElementById('userName').textContent = userInfo.username;
        document.getElementById('userRole').textContent = userInfo.role;
    }
    
    // Thêm class cho priority và status
    const taskPriority = document.getElementById('taskPriority');
    if (taskPriority) {
        taskPriority.setAttribute('data-priority', task.priority);
    }
    
    const taskStatus = document.getElementById('taskStatus');
    if (taskStatus) {
        taskStatus.className = task.status === 1 ? 'status-completed' : 'status-pending';
    }

    await loadUsers();
});

async function loadTaskDetails(taskId) {
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.status === 200) {
            const task = data.data;
            displayTaskDetails(task);
            populateEditForm(task);
        } else {
            showNotification('Không thể tải thông tin công việc', 'error');
        }
    } catch (error) {
        console.error('Error loading task details:', error);
        showNotification('Có lỗi xảy ra khi tải thông tin công việc', 'error');
    }
}

function displayTaskDetails(task) {
    // Các phần hiện có
    document.getElementById('taskTitle').textContent = task.title;
    document.getElementById('taskDescription').textContent = task.description;
    document.getElementById('taskDueDate').textContent = formatDate(task.date);
    document.getElementById('taskPriority').textContent = getPriorityLabel(task.priority);
    document.getElementById('taskStatus').textContent = task.status === 1 ? 'Hoàn thành' : 'Đang thực hiện';

    // Hiển thị thông tin người được giao
    const assigneeElement = document.querySelector('.assignee-name');
    const assigneeEmailElement = document.querySelector('.assignee-email');
    
    if (task.assignee) {
        assigneeElement.textContent = task.assignee.name || task.assignee.username;
        assigneeEmailElement.textContent = task.assignee.email || '';
    } else {
        assigneeElement.textContent = 'Chưa phân công';
        assigneeEmailElement.textContent = '';
    }
}

async function loadUsers() {
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const response = await fetch('http://localhost:8080/api/v1/users', {
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`
            }
        });

        const data = await response.json();
        if (data.status === 200) {
            const selectElement = document.getElementById('editAssignee');
            data.data.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name || user.username;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function populateEditForm(task) {
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editDescription').value = task.description;
    document.getElementById('editDueDate').value = task.date;
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editStatus').value = task.status;
}

async function handleEditSubmit(event) {
    event.preventDefault();
    const taskId = new URLSearchParams(window.location.search).get('id');
    
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const updatedTask = {
            title: document.getElementById('editTitle').value,
            description: document.getElementById('editDescription').value,
            date: document.getElementById('editDueDate').value,
            priority: parseInt(document.getElementById('editPriority').value),
            status: parseInt(document.getElementById('editStatus').value)
        };

        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedTask)
        });

        const data = await response.json();
        if (data.status === 200) {
            showNotification('Cập nhật công việc thành công', 'success');
            closeEditModal();
            await loadTaskDetails(taskId);
        } else {
            showNotification('Lỗi khi cập nhật công việc', 'error');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Có lỗi xảy ra khi cập nhật công việc', 'error');
    }
}

async function loadComments(taskId) {
    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}/comments`, {
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`
            }
        });

        const data = await response.json();
        if (data.status === 200) {
            displayComments(data.data);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

async function addComment() {
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    
    if (!content) {
        showNotification('Vui lòng nhập nội dung bình luận', 'error');
        return;
    }

    try {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        const taskId = new URLSearchParams(window.location.search).get('id');
        
        const response = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();
        if (data.status === 200) {
            showNotification('Thêm bình luận thành công', 'success');
            commentInput.value = '';
            await loadComments(taskId);
        } else {
            showNotification('Lỗi khi thêm bình luận', 'error');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Có lỗi xảy ra khi thêm bình luận', 'error');
    }
}

function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${comment.userName}</span>
                <span class="comment-date">${formatDate(comment.createdAt)}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
        </div>
    `).join('');
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function getPriorityLabel(priority) {
    switch (priority) {
        case 0: return 'Thấp';
        case 1: return 'Trung bình';
        case 2: return 'Cao';
        default: return 'Không xác định';
    }
}

function showNotification(message, type) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}