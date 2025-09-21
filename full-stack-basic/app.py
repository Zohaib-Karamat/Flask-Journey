from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE = 'todos.db'

def get_db_connection():
    """Get database connection with row factory for dict-like access"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with todos table"""
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            completed BOOLEAN NOT NULL DEFAULT 0,
            priority TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

@app.route('/')
def index():
    """Render the main todo application page"""
    return render_template('index.html')

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Get all todos with optional filtering"""
    try:
        conn = get_db_connection()
        
        # Get query parameters for filtering
        completed = request.args.get('completed')
        priority = request.args.get('priority')
        
        query = 'SELECT * FROM todos'
        params = []
        
        # Build dynamic query based on filters
        conditions = []
        if completed is not None:
            conditions.append('completed = ?')
            params.append(1 if completed.lower() == 'true' else 0)
        
        if priority:
            conditions.append('priority = ?')
            params.append(priority)
        
        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)
        
        query += ' ORDER BY created_at DESC'
        
        todos = conn.execute(query, params).fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        todos_list = []
        for todo in todos:
            todos_list.append({
                'id': todo['id'],
                'title': todo['title'],
                'description': todo['description'],
                'completed': bool(todo['completed']),
                'priority': todo['priority'],
                'created_at': todo['created_at'],
                'updated_at': todo['updated_at']
            })
        
        return jsonify({
            'success': True,
            'todos': todos_list,
            'count': len(todos_list)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/todos', methods=['POST'])
def create_todo():
    """Create a new todo"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('title'):
            return jsonify({
                'success': False,
                'error': 'Title is required'
            }), 400
        
        title = data['title'].strip()
        description = data.get('description', '').strip()
        priority = data.get('priority', 'medium')
        
        # Validate priority
        if priority not in ['low', 'medium', 'high']:
            priority = 'medium'
        
        conn = get_db_connection()
        cursor = conn.execute(
            'INSERT INTO todos (title, description, priority) VALUES (?, ?, ?)',
            (title, description, priority)
        )
        todo_id = cursor.lastrowid
        conn.commit()
        
        # Get the created todo
        todo = conn.execute('SELECT * FROM todos WHERE id = ?', (todo_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'todo': {
                'id': todo['id'],
                'title': todo['title'],
                'description': todo['description'],
                'completed': bool(todo['completed']),
                'priority': todo['priority'],
                'created_at': todo['created_at'],
                'updated_at': todo['updated_at']
            }
        }), 201
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """Update an existing todo"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        conn = get_db_connection()
        
        # Check if todo exists
        todo = conn.execute('SELECT * FROM todos WHERE id = ?', (todo_id,)).fetchone()
        if not todo:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Todo not found'
            }), 404
        
        # Prepare update fields
        fields = []
        params = []
        
        if 'title' in data:
            fields.append('title = ?')
            params.append(data['title'].strip())
        
        if 'description' in data:
            fields.append('description = ?')
            params.append(data['description'].strip())
        
        if 'completed' in data:
            fields.append('completed = ?')
            params.append(1 if data['completed'] else 0)
        
        if 'priority' in data and data['priority'] in ['low', 'medium', 'high']:
            fields.append('priority = ?')
            params.append(data['priority'])
        
        if fields:
            fields.append('updated_at = CURRENT_TIMESTAMP')
            params.append(todo_id)
            
            query = f'UPDATE todos SET {", ".join(fields)} WHERE id = ?'
            conn.execute(query, params)
            conn.commit()
        
        # Get updated todo
        updated_todo = conn.execute('SELECT * FROM todos WHERE id = ?', (todo_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'todo': {
                'id': updated_todo['id'],
                'title': updated_todo['title'],
                'description': updated_todo['description'],
                'completed': bool(updated_todo['completed']),
                'priority': updated_todo['priority'],
                'created_at': updated_todo['created_at'],
                'updated_at': updated_todo['updated_at']
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo"""
    try:
        conn = get_db_connection()
        
        # Check if todo exists
        todo = conn.execute('SELECT * FROM todos WHERE id = ?', (todo_id,)).fetchone()
        if not todo:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Todo not found'
            }), 404
        
        # Delete the todo
        conn.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Todo deleted successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/todos/stats', methods=['GET'])
def get_stats():
    """Get todo statistics"""
    try:
        conn = get_db_connection()
        
        total = conn.execute('SELECT COUNT(*) as count FROM todos').fetchone()['count']
        completed = conn.execute('SELECT COUNT(*) as count FROM todos WHERE completed = 1').fetchone()['count']
        pending = total - completed
        
        by_priority = {}
        priorities = conn.execute(
            'SELECT priority, COUNT(*) as count FROM todos GROUP BY priority'
        ).fetchall()
        
        for priority in priorities:
            by_priority[priority['priority']] = priority['count']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'completed': completed,
                'pending': pending,
                'by_priority': by_priority
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
