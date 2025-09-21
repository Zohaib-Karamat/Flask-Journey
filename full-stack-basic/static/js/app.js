// Todo App JavaScript - Professional Implementation
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.currentPriorityFilter = 'all';
        this.currentView = 'list';
        this.editingTodo = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.showLoading();
        await this.loadTodos();
        await this.loadStats();
        this.hideLoading();
    }

    bindEvents() {
        // Form submission
        document.getElementById('todoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTodo();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Priority filters
        document.querySelectorAll('.priority-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setPriorityFilter(e.target.dataset.priority);
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setView(e.target.dataset.view);
            });
        });

        // Modal events
        document.getElementById('editModalClose').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editCancel').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditSubmit();
        });

        // Confirm modal events
        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.closeConfirmModal();
        });

        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.handleConfirmDelete();
        });

        // Close modals when clicking outside
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeEditModal();
            }
        });

        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.closeConfirmModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
                this.closeConfirmModal();
            }
        });
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }
            
            return data;
        } catch (error) {
            this.showToast(error.message, 'error');
            throw error;
        }
    }

    async loadTodos() {
        try {
            const data = await this.apiCall('/todos');
            this.todos = data.todos;
            this.renderTodos();
        } catch (error) {
            console.error('Error loading todos:', error);
        }
    }

    async loadStats() {
        try {
            const data = await this.apiCall('/todos/stats');
            this.updateStats(data.stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async addTodo(todoData) {
        try {
            const data = await this.apiCall('/todos', {
                method: 'POST',
                body: JSON.stringify(todoData)
            });
            
            this.todos.unshift(data.todo);
            this.renderTodos();
            this.loadStats();
            this.showToast('Task added successfully!', 'success');
            
            return data.todo;
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    }

    async updateTodo(id, updates) {
        try {
            const data = await this.apiCall(`/todos/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index !== -1) {
                this.todos[index] = data.todo;
                this.renderTodos();
                this.loadStats();
            }
            
            this.showToast('Task updated successfully!', 'success');
            return data.todo;
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    }

    async deleteTodo(id) {
        try {
            await this.apiCall(`/todos/${id}`, {
                method: 'DELETE'
            });
            
            this.todos = this.todos.filter(todo => todo.id !== id);
            this.renderTodos();
            this.loadStats();
            this.showToast('Task deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    // Event Handlers
    async handleAddTodo() {
        const title = document.getElementById('todoTitle').value.trim();
        const description = document.getElementById('todoDescription').value.trim();
        const priority = document.getElementById('todoPriority').value;

        if (!title) {
            this.showToast('Please enter a task title', 'warning');
            return;
        }

        const todoData = {
            title,
            description,
            priority
        };

        const todo = await this.addTodo(todoData);
        if (todo) {
            // Clear form
            document.getElementById('todoForm').reset();
        }
    }

    handleEditTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        this.editingTodo = todo;
        
        // Populate form
        document.getElementById('editTitle').value = todo.title;
        document.getElementById('editDescription').value = todo.description || '';
        document.getElementById('editPriority').value = todo.priority;
        document.getElementById('editCompleted').checked = todo.completed;
        
        this.showEditModal();
    }

    async handleEditSubmit() {
        const title = document.getElementById('editTitle').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const priority = document.getElementById('editPriority').value;
        const completed = document.getElementById('editCompleted').checked;

        if (!title) {
            this.showToast('Please enter a task title', 'warning');
            return;
        }

        const updates = {
            title,
            description,
            priority,
            completed
        };

        await this.updateTodo(this.editingTodo.id, updates);
        this.closeEditModal();
    }

    handleDeleteTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        document.getElementById('confirmMessage').textContent = 
            `Are you sure you want to delete "${todo.title}"?`;
        
        this.pendingDeleteId = id;
        this.showConfirmModal();
    }

    async handleConfirmDelete() {
        if (this.pendingDeleteId) {
            await this.deleteTodo(this.pendingDeleteId);
            this.pendingDeleteId = null;
        }
        this.closeConfirmModal();
    }

    async handleToggleComplete(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        await this.updateTodo(id, { completed: !todo.completed });
    }

    // Filter and View Methods
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTodos();
    }

    setPriorityFilter(priority) {
        this.currentPriorityFilter = priority;
        
        // Update active button
        document.querySelectorAll('.priority-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === priority);
        });
        
        this.renderTodos();
    }

    setView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update list class
        const todosList = document.getElementById('todosList');
        todosList.classList.toggle('grid-view', view === 'grid');
        
        this.renderTodos();
    }

    // Rendering Methods
    renderTodos() {
        const filteredTodos = this.getFilteredTodos();
        const todosList = document.getElementById('todosList');
        const emptyState = document.getElementById('emptyState');

        if (filteredTodos.length === 0) {
            todosList.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        todosList.innerHTML = filteredTodos.map(todo => this.createTodoHTML(todo)).join('');
        
        // Bind event listeners for todo actions
        this.bindTodoEvents();
    }

    getFilteredTodos() {
        let filtered = [...this.todos];

        // Filter by completion status
        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(todo => todo.completed);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(todo => !todo.completed);
        }

        // Filter by priority
        if (this.currentPriorityFilter !== 'all') {
            filtered = filtered.filter(todo => todo.priority === this.currentPriorityFilter);
        }

        return filtered;
    }

    createTodoHTML(todo) {
        const createdDate = new Date(todo.created_at).toLocaleDateString();
        const priorityClass = `priority-${todo.priority}`;
        
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-header">
                    <div class="todo-main">
                        <h4 class="todo-title">${this.escapeHtml(todo.title)}</h4>
                        ${todo.description ? `<p class="todo-description">${this.escapeHtml(todo.description)}</p>` : ''}
                        <div class="todo-meta">
                            <span class="priority-badge ${priorityClass}">
                                ${todo.priority} priority
                            </span>
                            <span>Created: ${createdDate}</span>
                        </div>
                    </div>
                    <div class="todo-actions">
                        <button class="action-btn complete" data-action="toggle" data-id="${todo.id}" 
                                title="${todo.completed ? 'Mark as pending' : 'Mark as completed'}">
                            <i class="fas fa-${todo.completed ? 'undo' : 'check'}"></i>
                        </button>
                        <button class="action-btn edit" data-action="edit" data-id="${todo.id}" title="Edit task">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete" data-id="${todo.id}" title="Delete task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindTodoEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const action = btn.dataset.action;
                const id = parseInt(btn.dataset.id);
                
                switch (action) {
                    case 'toggle':
                        this.handleToggleComplete(id);
                        break;
                    case 'edit':
                        this.handleEditTodo(id);
                        break;
                    case 'delete':
                        this.handleDeleteTodo(id);
                        break;
                }
            });
        });
    }

    updateStats(stats) {
        document.getElementById('totalTodos').textContent = stats.total;
        document.getElementById('completedTodos').textContent = stats.completed;
        document.getElementById('pendingTodos').textContent = stats.pending;
    }

    // Modal Methods
    showEditModal() {
        document.getElementById('editModal').classList.add('show');
        document.body.style.overflow = 'hidden';
        document.getElementById('editTitle').focus();
    }

    closeEditModal() {
        document.getElementById('editModal').classList.remove('show');
        document.body.style.overflow = 'auto';
        this.editingTodo = null;
    }

    showConfirmModal() {
        document.getElementById('confirmModal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('show');
        document.body.style.overflow = 'auto';
        this.pendingDeleteId = null;
    }

    // UI Helper Methods
    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('todosList').innerHTML = '';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/js/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}