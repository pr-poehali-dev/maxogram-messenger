'''
Business: Send, receive and store messages (text and voice) between users
Args: event - dict with httpMethod, body (sender_id, receiver_id, message_text, voice_url)
      context - object with request_id, function_name attributes
Returns: HTTP response with messages list or confirmation
'''

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            query_params = event.get('queryStringParameters', {})
            user_id = query_params.get('user_id')
            other_user_id = query_params.get('other_user_id')
            
            if not user_id or not other_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id и other_user_id обязательны'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.voice_url, 
                       m.voice_duration, m.is_voice, m.created_at, m.read_at,
                       u.username as sender_name, u.avatar_initials as sender_avatar
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE (m.sender_id = %s AND m.receiver_id = %s) 
                   OR (m.sender_id = %s AND m.receiver_id = %s)
                ORDER BY m.created_at ASC
            """, (user_id, other_user_id, other_user_id, user_id))
            
            messages = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'messages': [dict(msg) for msg in messages]
                }, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'send')
            
            if action == 'send':
                sender_id = body_data.get('sender_id')
                receiver_id = body_data.get('receiver_id')
                message_text = body_data.get('message_text', '').strip()
                voice_url = body_data.get('voice_url')
                voice_duration = body_data.get('voice_duration')
                is_voice = body_data.get('is_voice', False)
                
                if not sender_id or not receiver_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'sender_id и receiver_id обязательны'}),
                        'isBase64Encoded': False
                    }
                
                if not message_text and not voice_url:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Сообщение не может быть пустым'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    INSERT INTO messages (sender_id, receiver_id, message_text, voice_url, voice_duration, is_voice)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, sender_id, receiver_id, message_text, voice_url, voice_duration, is_voice, created_at
                """, (sender_id, receiver_id, message_text if message_text else None, voice_url, voice_duration, is_voice))
                
                message = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'message': dict(message),
                        'status': 'Сообщение отправлено'
                    }, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'get_chats':
                user_id = body_data.get('user_id')
                
                if not user_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user_id обязателен'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    WITH last_messages AS (
                        SELECT DISTINCT ON (
                            CASE 
                                WHEN sender_id = %s THEN receiver_id 
                                ELSE sender_id 
                            END
                        )
                        CASE 
                            WHEN sender_id = %s THEN receiver_id 
                            ELSE sender_id 
                        END as other_user_id,
                        message_text,
                        is_voice,
                        created_at
                        FROM messages
                        WHERE sender_id = %s OR receiver_id = %s
                        ORDER BY 
                            CASE 
                                WHEN sender_id = %s THEN receiver_id 
                                ELSE sender_id 
                            END,
                            created_at DESC
                    )
                    SELECT u.id, u.username, u.avatar_initials, u.online,
                           lm.message_text as last_message,
                           lm.is_voice as last_message_is_voice,
                           lm.created_at as last_message_time,
                           (SELECT COUNT(*) FROM messages 
                            WHERE sender_id = u.id AND receiver_id = %s AND read_at IS NULL) as unread_count
                    FROM users u
                    JOIN last_messages lm ON u.id = lm.other_user_id
                    ORDER BY lm.created_at DESC
                """, (user_id, user_id, user_id, user_id, user_id, user_id))
                
                chats = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'chats': [dict(chat) for chat in chats]
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
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()
