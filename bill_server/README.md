# PDF Text Extraction API

A Flask-based API for extracting text from PDF files using PyMuPDF.

## Features

- Extract text from PDF files
- RESTful API with Swagger documentation
- Docker containerization
- Health check endpoint
- Error handling and validation

## API Endpoints

- `GET /` - Welcome page with navigation links
- `GET /health` - Health check endpoint
- `GET /extract-text` - API usage information
- `POST /extract-text` - Extract text from uploaded PDF file
- `GET /swagger-ui` - Interactive API documentation

## Docker Setup

### Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

### Development with Live Updates

For development with automatic code reloading:

1. **Run development environment with live updates:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Or use Docker Compose watch (Docker Compose v2.22+):**
   ```bash
   docker-compose -f docker-compose.dev.yml watch
   ```

3. **Stop development container:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

### Production Deployment

1. **Build and run the production container:**
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode:**
   ```bash
   docker-compose up -d --build
   ```

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Manual Docker Commands

1. **Build the Docker image:**
   ```bash
   docker build -t pdf-text-extraction-api .
   ```

2. **Run the container:**
   ```bash
   docker run -p 5000:5000 pdf-text-extraction-api
   ```

3. **Run with environment variables:**
   ```bash
   docker run -p 5000:5000 -e FLASK_ENV=development pdf-text-extraction-api
   ```

## Local Development Setup

1. **Create virtual environment:**
   ```bash
   python -m venv .venv
   ```

2. **Activate virtual environment:**
   - Windows: `.venv\Scripts\activate`
   - macOS/Linux: `source .venv/bin/activate`

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

## Usage

### Extract Text from PDF

**Endpoint:** `POST /extract-text`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Upload a PDF file with the key `file`

**Example using curl:**
```bash
curl -X POST -F "file=@your-document.pdf" http://localhost:5000/extract-text
```

**Response:**
```json
{
    "success": true,
    "message": "Text extracted successfully",
    "text": "--- Page 1 ---\nExtracted text content...",
    "page_count": 2,
    "filename": "your-document.pdf"
}
```

## Development Features

### Live Code Reloading
The development Docker setup includes:
- **Volume mounting**: Your local code changes are immediately reflected in the container
- **Auto-reload**: Flask automatically restarts when code changes are detected
- **Debug mode**: Detailed error messages and interactive debugging
- **Docker Compose Watch**: Advanced file watching for instant updates

### Development vs Production
- **Development**: Uses `docker-compose.dev.yml` with live reload and debug mode
- **Production**: Uses `docker-compose.yml` optimized for performance and stability

## Environment Variables

- `FLASK_ENV`: Set to `development` for debug mode, `production` for production
- `FLASK_DEBUG`: Set to `1` to enable debug mode (overrides FLASK_ENV)
- `PORT`: Port number (default: 5000)
- `HOST`: Host address (default: 0.0.0.0 for Docker)
- `PYTHONUNBUFFERED`: Set to `1` to see logs in real-time (development)

## Health Check

The application includes a health check endpoint at `/health` that returns the service status and available endpoints.

## API Documentation

Interactive API documentation is available at `/swagger-ui` when the application is running.

## Project Structure

```
.
├── app.py                 # Main Flask application
├── pymupdf_api.py         # PDF text extraction blueprint
├── schemas.py             # Marshmallow schemas
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker Compose configuration
├── .dockerignore         # Docker ignore file
└── README.md            # This file
```

## Dependencies

- Flask: Web framework
- Flask-Smorest: REST API framework with automatic OpenAPI documentation
- PyMuPDF: PDF processing library
- Marshmallow: Object serialization/deserialization

## Error Handling

The API includes comprehensive error handling for:
- Missing files
- Invalid file formats
- PDF processing errors
- Server errors

All errors return structured JSON responses with appropriate HTTP status codes.