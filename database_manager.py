import sqlite3 as sql
from pathlib import Path
from typing import Optional, Sequence

from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = Path(__file__).resolve().parent / 'database' / 'data_source.db'


def _get_connection():
  con = sql.connect(DB_PATH)
  con.row_factory = sql.Row
  return con


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
        skill_level TEXT,
        avatar_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
      '''
    )

    column_names = {
      row['name']
      for row in con.execute('PRAGMA table_info(user_profiles)')
    }

    if 'skill_level' not in column_names:
      con.execute('ALTER TABLE user_profiles ADD COLUMN skill_level TEXT')

    if 'avatar_path' not in column_names:
      con.execute('ALTER TABLE user_profiles ADD COLUMN avatar_path TEXT')

    con.execute(
      '''
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id INTEGER NOT NULL,
        drill_id TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, drill_id),
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
      )
      '''
    )


def _row_to_profile(row: Optional[sql.Row]):
  if not row:
    return None

  return {
    'id': row['id'],
    'name': row['full_name'],
    'email': row['email'],
    'dateOfBirth': row['date_of_birth'],
    'gender': row['gender'],
    'position': row['position'],
    'skillLevel': row['skill_level'],
    'avatarPath': row['avatar_path'],
  }


def _row_to_auth_user(row: Optional[sql.Row]):
  if not row:
    return None

  profile = _row_to_profile(row)
  if profile is None:
    return None
  profile['passwordHash'] = row['password']
  return profile


def create_user(payload):
  required = ['name', 'email', 'password']
  missing = [field for field in required if not payload.get(field)]
  if missing:
    raise ValueError(f"Missing required fields: {', '.join(missing)}")

  ensure_user_profiles_table()

  skill_level = payload.get('skillLevel') or 'Intermediate'
  hashed_password = generate_password_hash(payload['password'])

  params = (
    payload.get('name', '').strip(),
    payload.get('email', '').strip().lower(),
    hashed_password,
    payload.get('dateOfBirth'),
    payload.get('gender'),
    payload.get('position'),
    skill_level,
    payload.get('avatarPath'),
  )

  try:
    with _get_connection() as con:
      cursor = con.execute(
        '''
        INSERT INTO user_profiles (full_name, email, password, date_of_birth, gender, position, skill_level, avatar_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        params,
      )
      user_id = cursor.lastrowid
      row = con.execute(
        'SELECT id, full_name, email, date_of_birth, gender, position, skill_level, avatar_path FROM user_profiles WHERE id = ?',
        (user_id,),
      ).fetchone()
  except sql.IntegrityError as exc:
    raise ValueError('An account with that email already exists.') from exc

  return _row_to_profile(row)


def get_user_with_credentials(email: str):
  ensure_user_profiles_table()
  with _get_connection() as con:
    row = con.execute(
      'SELECT id, full_name, email, password, date_of_birth, gender, position, skill_level, avatar_path FROM user_profiles WHERE email = ?',
      (email.strip().lower(),),
    ).fetchone()
  return _row_to_auth_user(row)


def get_user_profile(profile_id):
  ensure_user_profiles_table()
  with _get_connection() as con:
    row = con.execute(
      'SELECT id, full_name, email, date_of_birth, gender, position, skill_level, avatar_path FROM user_profiles WHERE id = ?',
      (profile_id,),
    ).fetchone()
  return _row_to_profile(row)


def update_user_profile(profile_id, payload):
  ensure_user_profiles_table()
  fields = {
    'name': ('full_name', lambda v: v.strip()),
    'email': ('email', lambda v: v.strip().lower()),
    'password': ('password', lambda v: generate_password_hash(str(v))),
    'dateOfBirth': ('date_of_birth', str),
    'gender': ('gender', str),
    'position': ('position', str),
    'skillLevel': ('skill_level', str),
  }

  assignments = []
  values = []
  for key, (column, transform) in fields.items():
    if key in payload and payload[key] is not None:
      assignments.append(f'{column} = ?')
      values.append(transform(payload[key]))

  if not assignments:
    profile = get_user_profile(profile_id)
    if not profile:
      raise ValueError('Profile not found')
    return profile

  assignments.append('created_at = CURRENT_TIMESTAMP')

  try:
    with _get_connection() as con:
      con.execute(
        f"UPDATE user_profiles SET {', '.join(assignments)} WHERE id = ?",
        (*values, profile_id),
      )
      row = con.execute(
        'SELECT id, full_name, email, date_of_birth, gender, position, skill_level, avatar_path FROM user_profiles WHERE id = ?',
        (profile_id,),
      ).fetchone()
  except sql.IntegrityError as exc:
    raise ValueError('Email address already in use.') from exc

  profile = _row_to_profile(row)
  if not profile:
    raise ValueError('Profile not found')
  return profile


def get_avatar_path(profile_id):
  ensure_user_profiles_table()
  with _get_connection() as con:
    row = con.execute('SELECT avatar_path FROM user_profiles WHERE id = ?', (profile_id,)).fetchone()
  return row[0] if row else None


def update_avatar_path(profile_id, avatar_path):
  ensure_user_profiles_table()
  with _get_connection() as con:
    con.execute('UPDATE user_profiles SET avatar_path = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', (avatar_path, profile_id))
    row = con.execute(
      'SELECT id, full_name, email, date_of_birth, gender, position, skill_level, avatar_path FROM user_profiles WHERE id = ?',
      (profile_id,),
    ).fetchone()
  profile = _row_to_profile(row)
  if not profile:
    raise ValueError('Profile not found')
  return profile


def verify_user_credentials(email: str, password: str):
  user = get_user_with_credentials(email)
  if not user:
    return None
  if not check_password_hash(user['passwordHash'], password):
    return None
  return {key: value for key, value in user.items() if key != 'passwordHash'}


def list_favorites(user_id: int) -> list[str]:
  ensure_user_profiles_table()
  with _get_connection() as con:
    rows = con.execute(
      'SELECT drill_id FROM user_favorites WHERE user_id = ? ORDER BY order_index ASC, created_at ASC',
      (user_id,),
    ).fetchall()
  return [row['drill_id'] for row in rows]


def set_favorites(user_id: int, favorites: Sequence[str]):
  ensure_user_profiles_table()
  unique = []
  seen = set()
  for drill_id in favorites:
    if not drill_id or drill_id in seen:
      continue
    seen.add(drill_id)
    unique.append(drill_id)

  with _get_connection() as con:
    con.execute('DELETE FROM user_favorites WHERE user_id = ?', (user_id,))
    con.executemany(
      'INSERT INTO user_favorites (user_id, drill_id, order_index) VALUES (?, ?, ?)',
      [(user_id, drill_id, index) for index, drill_id in enumerate(unique)],
    )

  return unique


def toggle_favorite(user_id: int, drill_id: str):
  ensure_user_profiles_table()
  if not drill_id:
    return list_favorites(user_id)
  with _get_connection() as con:
    existing = con.execute(
      'SELECT 1 FROM user_favorites WHERE user_id = ? AND drill_id = ?',
      (user_id, drill_id),
    ).fetchone()
    if existing:
      con.execute('DELETE FROM user_favorites WHERE user_id = ? AND drill_id = ?', (user_id, drill_id))
    else:
      max_index = con.execute(
        'SELECT COALESCE(MAX(order_index), -1) FROM user_favorites WHERE user_id = ?',
        (user_id,),
      ).fetchone()[0]
      con.execute(
        'INSERT INTO user_favorites (user_id, drill_id, order_index) VALUES (?, ?, ?)',
        (user_id, drill_id, max_index + 1),
      )
  return list_favorites(user_id)
