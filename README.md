# Portfolio RAG Intelligent

An interactive AI-powered portfolio using RAG (Retrieval-Augmented Generation) to answer questions about my CV and projects.


## Concept

An innovative portfolio where visitors can ask natural language questions about my professional background and receive personalized responses in real-time, powered by artificial intelligence.

### Why this project?

- **Innovation**: Demonstration of advanced AI skills
- **Zero cost**: BYOK (Bring Your Own Key) architecture
- **Privacy**: Secure user data
- **Performance**: Responses in under 2 seconds

## Technologies

### Frontend
- **Next.js** - React framework with App Router
- **TypeScript** - Type safety and IntelliSense
- **Tailwind CSS** - Modern and responsive styling
- **Lucide React** - Elegant icons

### Artificial Intelligence
- **Groq API** - Ultra-fast LLM (Llama 3.1, Mixtral)
- **RAG** - Retrieval-Augmented Generation
- **Vector Search** - Client-side semantic search
- **Streaming** - Real-time responses

### Architecture
- **BYOK** - Bring Your Own Key (user provides API key)
- **Client-side RAG** - Browser-side processing
- **Static JSON** - Pre-generated index at build time
- **Zero backend** - Static deployment possible

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Free Groq API key ([console.groq.com](https://console.groq.com))

### Setup

```bash
# Clone the repository
git clone https://github.com/patricksardinha/PortfolioRAG.git
cd PortfolioRag

# Install dependencies
npm install

# Place your CV
# Copy your CV in PDF format to src/data/documents/cv.pdf

# Generate RAG index
npm run build-index

# Run in development
npm run dev
```

### Project structure

```
portfolio-rag/
├── src/
│   ├── app/                    # Next.js pages
│   ├── lib/                    # Services (Groq, Search)
│   ├── data/
│   │   ├── documents/          # Your source PDFs
│   │   └── processed/          # Generated index
│   └── components/             # React components
├── scripts/
│   └── build-index.ts          # Pre-processing script
└── docs/                       # Documentation
```

## Usage

### 1. Initial configuration

1. **Add your documents** to `src/data/documents/`
2. **Customize mock data** in `scripts/build-index.ts`
3. **Generate index**: `npm run build-index`

### 2. Development

```bash
# Development
npm run dev

# Complete build (index + app)
npm run build

# Regenerate index after CV modification
npm run build-index
```

### 3. For users

1. Visit the portfolio
2. Create a free Groq API key
3. Configure the key in the interface
4. Ask natural language questions!

## Customization

### Modify your information

1. **CV**: Replace `src/data/documents/cv.pdf or .txt`
2. **Mock data**: Edit data in `scripts/build-index.ts`
3. **Suggestions**: Modify suggested questions in `src/app/page.tsx`

### Styling

- **Design**: Modify components in `src/app/page.tsx`
- **Colors**: Adapt Tailwind classes
- **Layout**: Customize responsive structure

### Features

- **AI Models**: Add other providers in `src/lib/groq.ts`
- **Search**: Improve algorithm in `src/lib/search.ts`
- **Analytics**: Integrate question tracking

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Other platforms

- **Netlify**: `npm run build && netlify deploy --prod --dir=out`
- **GitHub Pages**: Enable static export in `next.config.ts`

## Contributing

Contributions are welcome! 

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Star this repo if it helped you!