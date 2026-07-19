# Mind Reader - Cognitive Profiler Application

Mind Reader is an advanced cognitive/psychological/psychopathological profiler application that leverages multiple Large Language Models (LLMs) for comprehensive text analysis and psychological profiling.

## Features

- **Six Analysis Types**: Cognitive, comprehensive cognitive, psychological, comprehensive psychological, psychopathological, and comprehensive psychopathological
- **Real-time Streaming**: Live analysis results with question-by-question responses
- **Multi-LLM Integration**: Support for OpenAI, Anthropic Claude, DeepSeek, and Perplexity APIs
- **File Upload Support**: PDF, Word documents, and text files with intelligent text extraction
- **Advanced Text Chunking**: Automatic text segmentation for optimal analysis
- **Dialogue System**: Post-analysis conversation capability with regeneration options
- **Professional Scoring**: Calibrated scoring system where XX/100 means author outperforms XX people

## Technology Stack

- **Frontend**: React with TypeScript, Vite, shadcn/ui components, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: Server-Sent Events (SSE)
- **File Processing**: PDF-parse, Mammoth for document processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- API keys for at least one LLM provider (OpenAI, Anthropic, DeepSeek, or Perplexity)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mind-reader
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic Claude API key (optional)
- `DEEPSEEK_API_KEY` - DeepSeek API key (optional)
- `PERPLEXITY_API_KEY` - Perplexity API key (optional)

4. Run database migrations:
```bash
npm run db:migrate
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Usage

1. **Input Text**: Enter text directly or upload a document (PDF, Word, or text file)
2. **Select Analysis Type**: Choose from six different analysis modes
3. **Configure Analysis**: Select LLM provider and add any additional context
4. **Run Analysis**: Watch real-time results as each question is processed
5. **Review Results**: Get comprehensive psychological and cognitive profiling
6. **Continue Dialogue**: Engage in post-analysis conversation or regenerate results

## API Documentation

### Analysis Endpoints

- `POST /api/analysis/start` - Start a new analysis
- `GET /api/analysis/:id` - Get analysis results
- `GET /api/analysis/:id/dialogue` - Get dialogue messages
- `POST /api/analysis/:id/dialogue` - Send dialogue message
- `POST /api/analysis/:id/regenerate` - Regenerate analysis
- `GET /api/analysis/:id/download` - Download analysis results

### File Upload

- `POST /api/upload` - Upload and process documents

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Replit development environment
- Powered by advanced LLM models for cognitive analysis
- Uses revised intelligence protocol for sophisticated text evaluation