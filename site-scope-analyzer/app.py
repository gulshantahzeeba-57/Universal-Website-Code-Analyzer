import os
import sys
import tempfile
import uuid

# Vercel (and some other serverless hosts) import this file as a top-level
# module without adding its own folder to sys.path, which breaks the
# sibling import below ("from analyzer import ..."). Adding it explicitly
# makes the import work the same way locally and on Vercel.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from analyzer import SiteScopeAnalyzer

base_dir = os.path.abspath(os.path.dirname(__file__))
parent_dir = os.path.dirname(base_dir)

load_dotenv(os.path.join(parent_dir, 'templates', '.env'))
load_dotenv(os.path.join(parent_dir, '.env'))
load_dotenv(os.path.join(base_dir, '.env'))

app = Flask(
    __name__,
    template_folder=os.path.join(parent_dir, 'templates'),
    static_folder=os.path.join(parent_dir, 'static')
)

# Upload Configuration (50 MB Maximum File Size)
# Uses the system temp dir (tempfile.gettempdir()) instead of a project-local
# folder because serverless hosts like Vercel only allow writes to /tmp —
# the rest of the deployed filesystem is read-only. This works the same way
# locally too.
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  

analyzer = SiteScopeAnalyzer()

# Handle 413 File Too Large Error
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File size exceeds maximum limit of 50 MB.'}), 413

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/app')
def dashboard():
    return render_template('app.html')

@app.route('/analyze-url', methods=['POST'])
def analyze_url():
    data = request.get_json() or {}
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'Please enter a valid website URL.'}), 400
        
    result = analyzer.analyze_live_url(url)
    return jsonify(result)

@app.route('/analyze-zip', methods=['POST'])
def analyze_zip():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400
        
    file = request.files['file']
    if file.filename == '' or not file.filename.endswith('.zip'):
        return jsonify({'error': 'Only .ZIP archive files are supported.'}), 400

    filename = secure_filename(file.filename)
    # Prefix with a random token so concurrent uploads on a shared /tmp
    # (as on serverless hosts) never collide or overwrite each other.
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    file.save(file_path)

    result = analyzer.analyze_zip_file(file_path)

    # Cleanup temporary file
    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)