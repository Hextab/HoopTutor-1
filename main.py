import os
from pathlib import Path
from uuid import uuid4

from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

import database_manager as db_handler

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / 'static' / 'uploads'
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB avatars
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'change-me-hooptutor')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

ALLOWED_AVATAR_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

db_handler.ensure_user_profiles_table()


def _allowed_file(filename):
  return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AVATAR_EXTENSIONS


def _serialise_profile(profile):
  if not profile:
    return None

  avatar_path = profile.get('avatarPath')
  avatar_url = f"/static/uploads/{avatar_path}" if avatar_path else '/static/images/user.jpg'

  return {
    'id': profile.get('id'),
    'name': profile.get('name'),
    'email': profile.get('email'),
    'dateOfBirth': profile.get('dateOfBirth'),
    'gender': profile.get('gender'),
    'position': profile.get('position'),
    'skillLevel': profile.get('skillLevel'),
    'avatar': avatar_url,
    'hasCustomAvatar': bool(avatar_path),
  }


def _current_user_id():
  return session.get('user_id')


def _ensure_authenticated():
  user_id = _current_user_id()
  if not user_id:
    return None
  profile = db_handler.get_user_profile(user_id)
  if not profile:
    session.pop('user_id', None)
    return None
  return profile


def _profile_response(profile, favorites=None, status=200):
  data = {
    'profile': _serialise_profile(profile),
    'favorites': favorites if favorites is not None else [],
    'authenticated': bool(profile)
  }
  return jsonify(data), status


@app.route('/index.html', methods=['GET'])
@app.route('/', methods=['POST', 'GET'])
def index():
    return render_template('index.html', active_page='home')


@app.route('/shooting.html')
def shooting():
    return render_template('shooting.html', active_page='shooting')


@app.route('/ball-handling.html')
def ball_handling():
    return render_template('ball-handling.html', active_page='ball-handling')


@app.route('/defense.html')
def defense():
    return render_template('defense.html', active_page='defense')


@app.route('/fitness.html')
def fitness():
    return render_template('fitness.html', active_page='fitness')


@app.route('/about.html')
def about():
    return render_template('about.html', active_page='about')


@app.route('/library.html')
def library():
    return render_template('library.html', active_page='library')


@app.route('/login')
def login():
    return render_template('login.html', active_page='login')


@app.route('/profile')
def profile():
    return render_template('profile.html', active_page='profile')


@app.route('/api/signup', methods=['POST'])
def api_signup():
  data = request.get_json(force=True, silent=True) or {}
  data.pop('avatarPath', None)
  if not data.get('skillLevel'):
    data['skillLevel'] = 'Intermediate'
  try:
    profile = db_handler.create_user(data)
  except ValueError as exc:
    return jsonify({'error': str(exc)}), 400
  except Exception:
    return jsonify({'error': 'Unable to save profile right now. Please try again.'}), 500

  session['user_id'] = profile['id']
  favorites = []
  return _profile_response(profile, favorites, status=201)


@app.route('/api/login', methods=['POST'])
def api_login():
  data = request.get_json(force=True, silent=True) or {}
  email = (data.get('email') or '').strip().lower()
  password = data.get('password') or ''
  if not email or not password:
    return jsonify({'error': 'Email and password are required.'}), 400

  try:
    user_auth = db_handler.get_user_with_credentials(email)
  except Exception:
    user_auth = None

  if not user_auth:
    return jsonify({'error': 'Invalid email or password.'}), 401

  password_hash = user_auth.get('passwordHash') or ''
  password_valid = False
  legacy_plaintext = False

  if password_hash:
    try:
      password_valid = check_password_hash(password_hash, password)
    except (ValueError, TypeError):
      password_valid = False
  if not password_valid and password_hash == password:
    password_valid = True
    legacy_plaintext = True

  if not password_valid:
    return jsonify({'error': 'Invalid email or password.'}), 401

  if legacy_plaintext:
    try:
      db_handler.update_user_profile(user_auth['id'], {'password': password})
      refreshed = db_handler.get_user_with_credentials(email)
      if refreshed:
        user_auth = refreshed
    except Exception:
      pass

  session['user_id'] = user_auth['id']
  profile = {key: value for key, value in user_auth.items() if key != 'passwordHash'}
  favorites = db_handler.list_favorites(profile['id'])
  return _profile_response(profile, favorites)


@app.route('/api/logout', methods=['POST'])
def api_logout():
  session.pop('user_id', None)
  return jsonify({'ok': True})


@app.route('/api/session', methods=['GET'])
def api_session_state():
  profile = _ensure_authenticated()
  if not profile:
    return jsonify({'authenticated': False}), 200
  favorites = db_handler.list_favorites(profile['id'])
  return _profile_response(profile, favorites)


@app.route('/api/profile', methods=['GET', 'PUT'])
def api_profile():
  profile = _ensure_authenticated()
  if not profile:
    return jsonify({'error': 'Login required.'}), 401

  if request.method == 'GET':
    favorites = db_handler.list_favorites(profile['id'])
    return _profile_response(profile, favorites)

  data = request.get_json(force=True, silent=True) or {}
  data.pop('avatarPath', None)
  try:
    updated = db_handler.update_user_profile(profile['id'], data)
  except ValueError as exc:
    return jsonify({'error': str(exc)}), 400
  except Exception:
    return jsonify({'error': 'Unable to update profile right now. Please try again.'}), 500

  favorites = db_handler.list_favorites(profile['id'])
  return _profile_response(updated, favorites)


@app.route('/api/profile/avatar', methods=['POST', 'DELETE'])
def api_profile_avatar():
  profile = _ensure_authenticated()
  if not profile:
    return jsonify({'error': 'Login required.'}), 401

  profile_id = profile['id']

  UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

  if request.method == 'DELETE':
    existing_path = db_handler.get_avatar_path(profile_id)
    if existing_path:
      file_path = UPLOAD_FOLDER / existing_path
      if file_path.exists():
        file_path.unlink()
    updated = db_handler.update_avatar_path(profile_id, None)
    favorites = db_handler.list_favorites(profile_id)
    return _profile_response(updated, favorites)

  file = request.files.get('avatar')
  if not file or not file.filename:
    return jsonify({'error': 'No file provided.'}), 400

  filename = secure_filename(file.filename)
  if not _allowed_file(filename):
    return jsonify({'error': 'Unsupported file type. Please upload a PNG, JPG, GIF, or WEBP image.'}), 400

  extension = filename.rsplit('.', 1)[1].lower()
  new_filename = f"profile_{profile_id}_{uuid4().hex}.{extension}"

  existing_path = db_handler.get_avatar_path(profile_id)
  if existing_path:
    old_file = UPLOAD_FOLDER / existing_path
    if old_file.exists():
      old_file.unlink()

  file_path = UPLOAD_FOLDER / new_filename
  file.save(file_path)

  updated = db_handler.update_avatar_path(profile_id, new_filename)
  favorites = db_handler.list_favorites(profile_id)
  return _profile_response(updated, favorites)


@app.route('/api/favorites', methods=['GET', 'PUT'])
def api_favorites():
  profile = _ensure_authenticated()
  if not profile:
    return jsonify({'error': 'Login required.'}), 401

  user_id = profile['id']

  if request.method == 'GET':
    favorites = db_handler.list_favorites(user_id)
    return jsonify({'favorites': favorites})

  data = request.get_json(force=True, silent=True) or {}
  favorites = data.get('favorites') or []
  try:
    stored = db_handler.set_favorites(user_id, favorites)
  except Exception:
    return jsonify({'error': 'Unable to update favourites right now.'}), 500
  return jsonify({'favorites': stored})


@app.route('/service-worker.js')
def service_worker():
    return app.send_static_file('js/service-worker.js')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5100)
