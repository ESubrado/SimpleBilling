# Billing Side Project

This project is a full-stack application for Simplifying a PDF type billing document processing and analysis, combining a Next.js frontend with a Flask backend API.

## Project Structure

```
Billing_SideProject/
├── bill_client
|   |── README.md
|   ├── package.json               # Next.js frontend dependencies
|   ├── next.config.js             # Next.js configuration
|   ├── app/                       # Next.js app directory
|   │   ├── page.tsx               # Main frontend page
|   └───...                    # Other frontend components
├── bill_server/               # Flask backend API
│   ├── app.py                # Flask application entry point
│   ├── keywords.json         # Keyword configuration file
│   ├── requirements.txt      # Python dependencies
│   ├── schemas.py           # Marshmallow schemas for API validation
│   └── resources/           # API resource modules
|   │    ├── __init__.py
|   │    ├── contactMoneyExtraction.py  # Contact money extraction API
|   │    └── pymupdf_api.py            # PDF text extraction API
|   └── docker-compose.yml         # Docker configuration (if applicable)
|____README.md
```

## Features

### Backend API (Flask + Flask-Smorest)
- **PDF Text Extraction**: Extract and analyze text from PDF billing documents
- **Contact Money Extraction**: Find money amounts associated with specific contacts
- **Bill Summary Analysis**: Extract billing details and amounts from bill summary pages
- **Account Level Charges**: Extract late fees and account-level charges
- **Previous Balance Processing**: Extract previous balance information
- **Keyword-Based Search**: Configurable keyword matching via `keywords.json`

### Frontend (Next.js)
- Modern React-based interface
- File upload functionality for PDF documents
- Real-time processing results display
- Responsive design with Geist font optimization

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Python 3.8+ (for backend)
- pip (Python package manager)

### Frontend Setup

1. Install frontend dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the Next.js development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd bill_server
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask development server:
```bash
python app.py
```

The API will be available at `http://localhost:5000` (or your configured port).

## API Endpoints

### PDF Text Extraction
- **POST** `/extract-text`
- Extract various billing information from PDF documents
- Includes bill summary, account charges, and previous balance data

## Configuration

### Keywords Configuration (`bill_server/keywords.json`)
The application uses a JSON configuration file to define:
- **exclude_keywords**: Words to exclude from extraction
- **required_keywords**: Keywords to search for with associated money amounts
- **inline_sentences**: Sentences to extract billing details from
- **account_level_keywords**: Account-level charge identifiers
- **previous_balance_keywords**: Previous balance related terms

Example structure:
```json
{
  "exclude_keywords": ["in", "pay", "auto", "device"],
  "required_keywords": [
    {
      "keyword": "Monthly Charges",
      "name": "Monthly Charges",
      "ukey": "monthly",
      "search_range": 50,
      "sub_key": [...]
    }
  ],
  "inline_sentences": [...],
  "account_level_keywords": {...},
  "previous_balance_keywords": [...]
}
```

## Dependencies

### Frontend
- Next.js 14+
- React 18+
- TypeScript
- Geist font family

### Backend
- Flask
- Flask-Smorest (API framework)
- PyMuPDF (PDF processing)
- Marshmallow (data validation)
- Regular expressions for text processing

## Development

### Frontend Development
The frontend uses Next.js with the app directory structure. Main page is located at `app/page.tsx` and auto-updates during development.

### Backend Development
The Flask API uses:
- Blueprint-based organization for different endpoints
- Marshmallow schemas for request/response validation
- PyMuPDF for PDF text extraction and processing
- Configurable keyword matching system

## Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub repository](https://github.com/vercel/next.js)

### Flask Resources
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Flask-Smorest Documentation](https://flask-smorest.readthedocs.io/)
- [PyMuPDF Documentation](https://pymupdf.readthedocs.io/)

## Deployment

### Frontend Deployment
The easiest way to deploy the Next.js frontend is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Backend Deployment
The Flask backend can be deployed using:
- Docker containers
- Cloud platforms (AWS, Google Cloud, Azure)
- Traditional hosting services

Make sure to:
1. Set environment variables for production
2. Configure proper CORS settings
3. Set up proper file upload limits
4. Ensure `keywords.json` is accessible in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## License

[Add your license information here]
