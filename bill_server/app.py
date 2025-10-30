from flask import Flask, jsonify, request
from flask_smorest import Api
from flask_cors import CORS
from resources.verizonbus_api import blp as pdf_text_extraction_blueprint

# Import Strawberry schema for GraphQL
from resources.strawberry_postgres import schema, all200_users, users_query

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Configure Flask-Smorest
app.config["API_TITLE"] = "PDF Text Extraction API"
app.config["API_VERSION"] = "v1"
app.config["OPENAPI_VERSION"] = "3.0.2"
app.config["OPENAPI_URL_PREFIX"] = "/"
app.config["OPENAPI_SWAGGER_UI_PATH"] = "/swagger-ui"
app.config["OPENAPI_SWAGGER_UI_URL"] = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"

# Initialize Flask-Smorest API
api = Api(app)


# Register blueprints
api.register_blueprint(pdf_text_extraction_blueprint)

# Import and register the /users route from strawberry_postgres
app.add_url_rule("/users", view_func=all200_users, methods=["GET"])
app.add_url_rule("/usersbyquery", view_func=users_query, methods=["GET"])

@app.route("/")
def hello_world():
    return """<h1>PDF Text Extraction API</h1>
    <p>Welcome to the PDF Text Extraction API powered by PyMuPDF!</p>
    <ul>
        <li><a href='/swagger-ui'>API Documentation (Swagger UI)</a></li>
        <li><a href='/extract-text'>Text Extraction Endpoint Info</a></li>
        <li><a href='/health'>Health Check</a></li>
    </ul>"""

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the PDF text extraction service"""
    return jsonify({
        "status": "healthy",
        "service": "PDF Text Extraction API",
        "version": "v1",
        "description": "Service for extracting text from PDF files using PyMuPDF",
        "endpoints": {
            "GET /extract-text": "Get usage information",
            "POST /extract-text": "Extract text from PDF file"
        }
    })


if __name__ == '__main__':
    import os
    # Use environment variables for configuration
    debug_mode = os.getenv('FLASK_ENV') == 'development' or os.getenv('FLASK_DEBUG') == '1'
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    
    app.run(
        host=host, 
        port=port, 
        debug=debug_mode,
        use_reloader=debug_mode,  # Enable auto-reload in development
        threaded=True
    )
