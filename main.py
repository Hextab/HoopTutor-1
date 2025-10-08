from flask import Flask, render_template, request, jsonify
import database_manager as db_handler

app = Flask(__name__)

db_handler.ensure_user_profiles_table()


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
    try:
        profile = db_handler.save_user_profile(data)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        return jsonify({'error': 'Unable to save profile right now. Please try again.'}), 500

    profile['avatar'] = '/static/images/user.jpg'
    return jsonify(profile), 201


@app.route('/service-worker.js')
def service_worker():
    return app.send_static_file('js/service-worker.js')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5100)
