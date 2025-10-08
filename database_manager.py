import sqlite3 as sql
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / 'database' / 'data_source.db'


def _get_connection():
  return sql.connect(DB_PATH)


def listExtension():
  with _get_connection() as con:
    cur = con.cursor()
    data = cur.execute('SELECT * FROM extension').fetchall()
  return data


def ensure_user_profiles_table():
  with _get_connection() as con:
    con.execute(
      '''
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT,
        position TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
      '''
    )


def save_user_profile(payload):
  required = ['name', 'email', 'password']
  missing = [field for field in required if not payload.get(field)]
  if missing:
    raise ValueError(f"Missing required fields: {', '.join(missing)}")

  ensure_user_profiles_table()

  params = (
    payload.get('name', '').strip(),
    payload.get('email', '').strip().lower(),
    payload.get('password', ''),
    payload.get('dateOfBirth'),
    payload.get('gender'),
    payload.get('position'),
  )

  with _get_connection() as con:
    con.execute(
      '''
      INSERT INTO user_profiles (full_name, email, password, date_of_birth, gender, position)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name=excluded.full_name,
        password=excluded.password,
        date_of_birth=excluded.date_of_birth,
        gender=excluded.gender,
        position=excluded.position,
        created_at=CURRENT_TIMESTAMP
      ''',
      params,
    )
    row = con.execute(
      'SELECT id, full_name, email, date_of_birth, gender, position FROM user_profiles WHERE email = ?',
      (params[1],),
    ).fetchone()

  return {
    'id': row[0],
    'name': row[1],
    'email': row[2],
    'dateOfBirth': row[3],
    'gender': row[4],
    'position': row[5],
  }
