from flask import Flask
from flask import render_template
from flask import request
from flask import jsonify
from flask import jsonify, session
from models import User   # adjust if your User model lives in a different file
import database_manager as dbHandler

app = Flask(__name__)

# Example drill data for demonstration
shooting_drills = [
    {
        'title': 'Wall Shooting Drill',
        'description': 'Isolate your shooting form by shooting close to a wall. Great for building muscle memory and consistency.',
        'skill': 'Beginner',
        'focus': 'Form',
        'image': 'static/images/wall-shooting.jpg',
    },
    {
        'title': '1-Hand Shooting Drill',
        'description': 'Practice with your shooting hand only to refine wrist action and follow-through.',
        'skill': 'Beginner',
        'focus': 'Form',
        'image': 'static/images/one-hand-shooting.jpg',
    },
    {
        'title': 'Elbow Shooting Drill',
        'description': 'Repetitive shots from the elbow to reinforce mid-range accuracy.',
        'skill': 'Intermediate',
        'focus': 'Form',
        'image': 'static/images/elbow-shooting.jpg',
    },
    {
        'title': 'Pass, Catch & Shoot Drill',
        'description': 'Partner passes ball; shooter catches and fires immediately.',
        'skill': 'Intermediate',
        'focus': 'Catch & Shoot',
        'image': 'static/images/catch-shoot.jpg',
    },
    {
        'title': 'Step-Back Shooting Drill',
        'description': 'Create space with a step-back and shoot.',
        'skill': 'Advanced',
        'focus': 'Off Dribble',
        'image': 'static/images/step-back.jpg',
    },
    # ...add more drills as needed...
]

ball_handling_drills = [
    {
        'title': 'Figure 8 Dribble',
        'description': 'Dribble the ball in a figure 8 pattern around and between your legs. Builds hand speed and coordination.',
        'skill': 'Beginner',
        'focus': 'Control & Coordination',
        'image': 'static/images/figure-8-dribble.jpg',
    },
    {
        'title': 'Cone Crossover Drill',
        'description': 'Dribble toward each cone and perform a crossover move to switch hands. Simulates defender pressure.',
        'skill': 'Intermediate',
        'focus': 'Change of Direction',
        'image': 'static/images/cone-crossover.jpg',
    },
    {
        'title': 'Spider Dribble',
        'description': 'Dribble rapidly in front and behind you using alternating hands. Builds rapid hand coordination.',
        'skill': 'Intermediate',
        'focus': 'Hand Speed & Ambidexterity',
        'image': 'static/images/spider-dribble.jpg',
    },
    {
        'title': 'Stationary Two-Ball Dribble',
        'description': 'Dribble both balls simultaneously at medium height. Builds symmetrical control and focus.',
        'skill': 'Advanced',
        'focus': 'Ambidexterity & Focus',
        'image': 'static/images/two-ball-dribble.jpg',
    },
    {
        'title': 'Z-Pattern Speed Dribble',
        'description': 'Sprint while dribbling, changing direction at each cone. Simulates game-like directional shifts.',
        'skill': 'Advanced',
        'focus': 'Speed & Directional Control',
        'image': 'static/images/z-pattern-dribble.jpg',
    },
]

@app.route('/index.html', methods=['GET'])
@app.route('/', methods=['POST', 'GET'])
def index():
   data = dbHandler.listExtension()
   return render_template('index.html', content=data)

@app.route('/shooting.html', methods=['GET'])
def shooting():
    return render_template('shooting.html', drills=shooting_drills)

@app.route('/ball-handling.html')
def ball_handling():
    return render_template('ball-handling.html', drills=ball_handling_drills)

@app.route('/defense.html')
def defense():
    return render_template('defense.html')

@app.route('/fitness.html')
def fitness():
    return render_template('fitness.html')

@app.route('/about.html')
def about():
    return render_template('about.html')

@app.route('/resources.html')
def resources():
    return render_template('resources.html')

@app.route('/library.html')
def library():
    return render_template('library.html', active_page='library')

@app.route('/search_shooting_drills', methods=['POST'])
def search_shooting_drills():
    data = request.get_json()
    skill = data.get('skill')
    focus = data.get('focus')
    keyword = data.get('keyword', '').lower()
    filtered = []
    for drill in shooting_drills:
        if (not skill or drill['skill'] == skill) and \
           (not focus or drill['focus'] == focus) and \
           (not keyword or keyword in drill['title'].lower() or keyword in drill['description'].lower()):
            filtered.append(drill)
    return jsonify(filtered)

@app.route('/search_ball_handling_drills', methods=['POST'])
def search_ball_handling_drills():
    data = request.get_json()
    skill = data.get('skill')
    focus = data.get('focus')
    keyword = data.get('keyword', '').lower()
    filtered = []
    for drill in ball_handling_drills:
        if (not skill or drill['skill'] == skill) and \
           (not focus or drill['focus'] == focus) and \
           (not keyword or keyword in drill['title'].lower() or keyword in drill['description'].lower()):
            filtered.append(drill)
    return jsonify(filtered)

@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html', active_page='login')

@app.route('/profile', methods=['GET'])
def profile():
    return render_template('profile.html', active_page='profile')

@app.route('/signup', methods=['POST'])
def signup():
    name = request.form.get('name')
    email = request.form.get('email')
    # Instead of showing a thank you, redirect to profile and let JS save info
    return f"""
    <script>
      localStorage.setItem('profile', JSON.stringify({{name: '{name}', email: '{email}'}}));
      window.location.href = '/profile';
    </script>
    """
@app.route('/api/me')
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({}), 401  # not logged in
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({}), 404

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar or "static/images/avatar1.png"
    })

if __name__ == '__main__':
  app.run(debug=True, host='0.0.0.0', port=5100)
