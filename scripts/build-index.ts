import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration avec logs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCUMENTS_DIR = path.join(__dirname, '../src/data/documents');
const OUTPUT_FILE = path.join(__dirname, '../src/data/processed/index.json');

console.log('DEBUG :');
console.log('DOCUMENTS_DIR:', DOCUMENTS_DIR);
console.log('OUTPUT_FILE:', OUTPUT_FILE);
console.log('__dirname:', __dirname);

// Vérifications initiales
console.log('Documents dir exists:', fs.existsSync(DOCUMENTS_DIR));
console.log('Output dir exists:', fs.existsSync(path.dirname(OUTPUT_FILE)));

if (fs.existsSync(DOCUMENTS_DIR)) {
  const files = fs.readdirSync(DOCUMENTS_DIR);
  console.log('Fichiers trouvés:', files);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  console.log('Fichiers PDF:', pdfFiles);
} else {
  console.log('Dossier documents introuvable !');
}

// Types
interface ChunkMetadata {
  id: string;
  type: string;
  title: string;
  content: string;
  source: string;
  wordCount: number;
  embedding: number[];
}

interface DocumentInfo {
  filename: string;
  processedAt: string;
  chunksCount: number;
  sections: string[];
}

interface SearchIndex {
  version: string;
  buildAt: string;
  totalDocuments: number;
  totalChunks: number;
  embeddingDimensions: number;
  documents: DocumentInfo[];
  chunks: ChunkMetadata[];
  searchConfig: {
    defaultTopK: number;
    minSimilarity: number;
    keywords: string[];
  };
}

interface RawChunk {
  type: string;
  title: string;
  content: string;
  source: string;
}

// Simulateur d'extraction PDF (pour développement)
class MockPDFParser {
  static extractText(filename: string): string {
    console.log(`Extraction texte pour: ${filename}`);
    
    // En production > pdf-parse ou pdfjs-dist
    const mockData: Record<string, string> = {
      'cv.pdf': `
JOHN DEVELOPER
Développeur Full-Stack JavaScript & IA

CONTACT
Email: john.dev@portfolio.com
LinkedIn: linkedin.com/in/johndev
GitHub: github.com/johndev

EXPÉRIENCE PROFESSIONNELLE

Senior Developer | TechCorp | 2022-2024
• Lead technique sur applications React/Node.js complexes
• Intégration d'APIs d'intelligence artificielle (OpenAI, Anthropic)
• Architecture microservices avec Docker et Kubernetes
• Mentoring équipe de 5 développeurs junior
• Technologies: React, TypeScript, Node.js, PostgreSQL, AWS

Développeur Full-Stack | StartupAI | 2021-2022
• Développement plateforme SaaS de 0 à 10k utilisateurs
• Stack: Next.js, React, Express.js, MongoDB
• Implémentation systèmes de paiement Stripe
• Optimisation performances et SEO

FORMATION
Master Informatique | École Tech Paris | 2019-2021
• Spécialisation IA et développement web
• Projet: Système de recommandation ML

COMPÉTENCES
Langages: JavaScript, TypeScript, Python, PHP
Frontend: React, Next.js, Vue.js, HTML5, CSS3, Tailwind
Backend: Node.js, Express.js, Django, Laravel
Bases de données: PostgreSQL, MongoDB, Redis
DevOps: Docker, AWS, Vercel, Git
IA: APIs LLM, RAG, Vector databases, Prompt engineering

PROJETS PERSONNELS

Portfolio RAG (2024)
• Système de questions-réponses alimenté par IA
• Architecture BYOK (Bring Your Own Key) 
• Technologies: React, Groq API, Vector search
• Déployé sur Vercel avec 0€ de coût serveur

E-commerce IA (2023)
• Plateforme avec recommandations personnalisées
• Next.js, Stripe, IA pour suggestions produits
• 1000+ utilisateurs actifs

Chat App Temps Réel (2022)
• WebSockets, Redis, React
• Messagerie cryptée end-to-end
      `.trim()
    };

    const extractedText = mockData[filename] || '';
    console.log(`Texte extrait: ${extractedText.length} caractères`);
    return extractedText;
  }
}

// Chunker simplifié pour le build
class DocumentChunker {
  static chunk(text: string, filename: string): RawChunk[] {
    console.log(`Chunking de ${filename}...`);
    
    const lines = text.split('\n').filter(line => line.trim());
    console.log(`Lignes trouvées: ${lines.length}`);
    
    const chunks: RawChunk[] = [];
    let currentSection: RawChunk | null = null;
    
    // Patterns de sections
    const sectionPatterns: Record<string, RegExp> = {
      'contact': /^(contact|coordonnées)/i,
      'experience': /^(expérience|experience)/i,
      'formation': /^(formation|éducation)/i,
      'competences': /^(compétences|skills)/i,
      'projets': /^(projets|projects)/i,
      'description': /^(description|présentation)/i,
      'technologies': /^(technologies|tech)/i,
      'resultats': /^(résultats|résultat)/i
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Détecter nouvelle section
      let newSectionType: string | null = null;
      for (const [type, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmedLine)) {
          newSectionType = type;
          console.log(`Section détectée: ${newSectionType} (ligne ${index})`);
          break;
        }
      }
      
      // Détecter en-tête (nom en début de document)
      if (index < 3 && /^[A-ZÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜŸÑÇ\s]{3,50}$/.test(trimmedLine)) {
        newSectionType = 'header';
        console.log(`Header détecté: ${trimmedLine}`);
      }
      
      if (newSectionType) {
        // Sauvegarder section précédente
        if (currentSection && currentSection.content.trim()) {
          chunks.push(currentSection);
          console.log(`Chunk sauvé: ${currentSection.type} (${currentSection.content.length} chars)`);
        }
        
        // Nouvelle section
        currentSection = {
          type: newSectionType,
          title: trimmedLine,
          content: '',
          source: filename
        };
      } else if (currentSection) {
        currentSection.content += trimmedLine + '\n';
      } else {
        // Première ligne sans section détectée
        currentSection = {
          type: 'general',
          title: 'Informations générales',
          content: trimmedLine + '\n',
          source: filename
        };
      }
    });
    
    // Ajouter dernière section
    if (currentSection && currentSection.content.trim()) {
      chunks.push(currentSection);
      console.log(`Dernier chunk sauvé: ${currentSection.type}`);
    }
    
    // Nettoyer et filtrer les chunks
    const filteredChunks = chunks.filter(chunk => chunk.content.trim().length > 20);
    console.log(`Chunks après filtre: ${filteredChunks.length}/${chunks.length}`);
    
    return filteredChunks;
  }
}

// Générateur d'embeddings simplifié (keywords)
class EmbeddingGenerator {
  static readonly keywords: string[] = [
    'javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'python',
    'html', 'css', 'tailwind', 'vue', 'angular', 'express',
    'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'aws',
    'git', 'vercel', 'stripe', 'api', 'rest', 'graphql',
    'développeur', 'developer', 'frontend', 'backend', 'fullstack',
    'senior', 'lead', 'tech', 'architecture', 'microservices',
    'performance', 'optimisation', 'seo', 'responsive',
    'intelligence', 'artificielle', 'ia', 'ai', 'machine', 'learning',
    'rag', 'embedding', 'vector', 'groq', 'openai', 'llm',
    'expérience', 'experience', 'projet', 'project', 'startup',
    'entreprise', 'équipe', 'team', 'mentoring', 'formation',
    'master', 'diplôme', 'université', 'école'
  ];

  static generateEmbedding(text: string): number[] {
    console.log(`Génération embedding pour ${text.length} caractères...`);
    const textLower = text.toLowerCase();
    
    const embedding = this.keywords.map(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textLower.match(regex) || [];
      const frequency = matches.length;
      const normalizedFreq = frequency / (text.length / 100);
      return Math.min(normalizedFreq, 1.0);
    });
    
    console.log(`Embedding généré: ${embedding.length} dimensions`);
    return embedding;
  }
}

// Fonction principale de build
async function buildIndex(): Promise<SearchIndex> {
  
  try {
    // Créer dossier de sortie
    const outputDir = path.dirname(OUTPUT_FILE);
    console.log(`Dossier sortie: ${outputDir}`);
    
    if (!fs.existsSync(outputDir)) {
      console.log(`Création dossier: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Traiter tous les PDFs
    const documents: DocumentInfo[] = [];
    const allChunks: ChunkMetadata[] = [];
    
    console.log(`\nRecherche fichiers dans: ${DOCUMENTS_DIR}`);
    
    if (fs.existsSync(DOCUMENTS_DIR)) {
      const files = fs.readdirSync(DOCUMENTS_DIR);
      console.log(`Tous fichiers: ${files.join(', ')}`);
      
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      console.log(`Fichiers PDF: ${pdfFiles.join(', ')}`);
      
      if (pdfFiles.length === 0) {
        console.log('Aucun fichier PDF trouvé !');
      }
      
      for (const filename of pdfFiles) {
        
        // Extraction texte
        const text = MockPDFParser.extractText(filename);
        
        if (!text.trim()) {
          console.warn(`Aucun texte extrait de ${filename}`);
          continue;
        }
        
        // Chunking
        const rawChunks = DocumentChunker.chunk(text, filename);
        console.log(`${rawChunks.length} chunks générés pour ${filename}`);
        
        // Génération embeddings et création des chunks finaux
        const chunksWithEmbeddings: ChunkMetadata[] = rawChunks.map((chunk, index) => {
          console.log(`Traitement chunk ${index + 1}/${rawChunks.length}: ${chunk.type}`);
          
          return {
            id: `${filename}_${index}`,
            type: chunk.type,
            title: chunk.title,
            content: chunk.content.trim(),
            source: chunk.source,
            wordCount: chunk.content.trim().split(' ').length,
            embedding: EmbeddingGenerator.generateEmbedding(chunk.content)
          };
        });
        
        documents.push({
          filename,
          processedAt: new Date().toISOString(),
          chunksCount: rawChunks.length,
          sections: [...new Set(rawChunks.map(c => c.type))]
        });
        
        allChunks.push(...chunksWithEmbeddings);
        console.log(`${filename} traité: ${chunksWithEmbeddings.length} chunks`);
      }
    } else {
      console.log(`Dossier ${DOCUMENTS_DIR} introuvable !`);
    }

    // Créer index final
    console.log('\nCréation index final...');
    
    const index: SearchIndex = {
      version: '1.0',
      buildAt: new Date().toISOString(),
      totalDocuments: documents.length,
      totalChunks: allChunks.length,
      embeddingDimensions: EmbeddingGenerator.keywords.length,
      documents,
      chunks: allChunks,
      searchConfig: {
        defaultTopK: 3,
        minSimilarity: 0.1,
        keywords: EmbeddingGenerator.keywords
      }
    };

    // Sauvegarder
    console.log(`Sauvegarde vers: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
    
    console.log(`Statistiques:`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Chunks: ${allChunks.length}`);
    console.log(`   - Taille: ${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB`);
    console.log(`   - Sortie: ${OUTPUT_FILE}`);

    return index;

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}


buildIndex().then(() => {
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});

export { buildIndex, EmbeddingGenerator };
export type { SearchIndex, ChunkMetadata, DocumentInfo };