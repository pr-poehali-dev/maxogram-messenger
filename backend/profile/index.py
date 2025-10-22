'''
Business: User profile management - update avatar, birth date, username (once per 3 days)
Args: event - dict with httpMethod, body (user_id, avatar_url, birth_date, new_username)
      context - object with request_id attribute
Returns: HTTP response with updated user data or error
'''

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
from datetime import datetime, timedelta
import re

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def validate_username(username: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9_]{3,20}$', username))

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if action == 'get_profile':
            user_id = body_data.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, username, email, phone, avatar_url, avatar_initials, birth_date, username_last_changed FROM users WHERE id = %s",
                (user_id,)
            )
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь не найден'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'user': dict(user)}, default=str),
                'isBase64Encoded': False
            }
        
        elif action == 'update_profile':
            user_id = body_data.get('user_id')
            avatar_url = body_data.get('avatar_url')
            birth_date = body_data.get('birth_date')
            new_username = body_data.get('new_username')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("SELECT username, username_last_changed FROM users WHERE id = %s", (user_id,))
            current_user = cur.fetchone()
            
            if not current_user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь не найден'}),
                    'isBase64Encoded': False
                }
            
            if new_username and new_username != current_user['username']:
                if not validate_username(new_username):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Юзернейм может содержать только английские буквы, цифры и _ (3-20 символов)'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("SELECT id FROM users WHERE username = %s AND id != %s", (new_username, user_id))
                if cur.fetchone():
                    return {
                        'statusCode': 409,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Этот юзернейм уже занят'}),
                        'isBase64Encoded': False
                    }
                
                last_changed = current_user['username_last_changed']
                if last_changed:
                    three_days_ago = datetime.now() - timedelta(days=3)
                    if last_changed > three_days_ago:
                        days_left = 3 - (datetime.now() - last_changed).days
                        return {
                            'statusCode': 429,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': f'Юзернейм можно менять раз в 3 дня. Осталось дней: {days_left}'}),
                            'isBase64Encoded': False
                        }
                
                cur.execute(
                    "UPDATE users SET username = %s, username_last_changed = CURRENT_TIMESTAMP WHERE id = %s",
                    (new_username, user_id)
                )
            
            if avatar_url is not None:
                cur.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, user_id))
            
            if birth_date:
                cur.execute("UPDATE users SET birth_date = %s WHERE id = %s", (birth_date, user_id))
            
            conn.commit()
            
            cur.execute(
                "SELECT id, username, email, phone, avatar_url, avatar_initials, birth_date, username_last_changed FROM users WHERE id = %s",
                (user_id,)
            )
            updated_user = cur.fetchone()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': dict(updated_user),
                    'message': 'Профиль обновлен'
                }, default=str),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неизвестное действие'}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()
