'''
Business: Password recovery via email/username with 6-digit code sent to Maxogram support chat
Args: event - dict with httpMethod, body (action, username, email, code, new_password)
      context - object with request_id attribute
Returns: HTTP response with code sent confirmation or password reset success
'''

import json
import os
import psycopg2
import hashlib
import random
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
from datetime import datetime, timedelta

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_code() -> str:
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
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
        if action == 'request_code':
            username = body_data.get('username', '').strip()
            
            if not username:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Укажите имя пользователя'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("SELECT id, username, email FROM users WHERE username = %s", (username,))
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь не найден'}),
                    'isBase64Encoded': False
                }
            
            code = generate_code()
            
            cur.execute(
                "INSERT INTO recovery_codes (user_id, code) VALUES (%s, %s) RETURNING id",
                (user['id'], code)
            )
            conn.commit()
            
            cur.execute("SELECT id FROM users WHERE username = 'maxogram_support'")
            support = cur.fetchone()
            
            if support:
                message = f"Код восстановления для @{user['username']}: {code}\n\nКод действителен 15 минут."
                cur.execute(
                    "INSERT INTO messages (sender_id, receiver_id, message_text, is_voice) VALUES (%s, %s, %s, false)",
                    (support['id'], user['id'], message)
                )
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': 'Код отправлен в чат с Максограм',
                    'user_id': user['id']
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'reset_password':
            username = body_data.get('username', '').strip()
            code = body_data.get('code', '').strip()
            new_password = body_data.get('new_password', '')
            
            if not username or not code or not new_password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Все поля обязательны'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь не найден'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id FROM recovery_codes WHERE user_id = %s AND code = %s AND used = false AND expires_at > CURRENT_TIMESTAMP",
                (user['id'], code)
            )
            recovery = cur.fetchone()
            
            if not recovery:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверный или истекший код'}),
                    'isBase64Encoded': False
                }
            
            password_hash = hash_password(new_password)
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (password_hash, user['id']))
            cur.execute("UPDATE recovery_codes SET used = true WHERE id = %s", (recovery['id'],))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Пароль успешно изменен'}),
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
