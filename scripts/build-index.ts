import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCUMENTS_DIR = path.join(__dirname, '../src/data/documents');
const OUTPUT_FILE = path.join(__dirname, '../src/data/processed/index.json');

console.log('BUILD INDEX - PATRICK SARDINHA CV\n');

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

// Parser optimisé pour le CV de Patrick
class PatrickCVParser {
  static extractText(filePath: string): string {
    console.log(`Lecture CV: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier introuvable: ${filePath}`);
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    console.log(`CV lu: ${text.length} caractères`);
    return text;
  }
}

// Chunker spécialisé pour le format du CV
class PatrickCVChunker {
  static chunk(text: string, filename: string): RawChunk[] {
    console.log(`📋 Analyse du CV de Patrick...`);
    
    const lines = text.split('\n').filter(line => line.trim());
    const chunks: RawChunk[] = [];
    let currentSection: RawChunk | null = null;
    
    // Patterns spécifiques au CV
    const sectionPatterns: Record<string, RegExp> = {
      'profil': /^(À PROPOS|PROFIL|PRÉSENTATION)/i,
      'diplomes': /^(DIPLÔMES|FORMATION|ÉDUCATION)/i,
      'competences': /^(COMPÉTENCES|TECHNOLOGIES|SKILLS)/i,
      'experiences': /^(EXPÉRIENCES|EXPÉRIENCE)/i,
      'formations_complementaires': /^(FORMATIONS COMPLÉMENTAIRES|CERTIFICATIONS)/i,
      'projets': /^(PROJETS PERSONNELS NOTABLES|PROJETS PERSONNELS|PROJETS|RÉALISATIONS)/i,
      'langues': /^(LANGUES|LANGUAGES)/i
    };

    // Patterns pour détecter les entrées individuelles
    const entryPatterns = {
      diplome: /^(Master|Bachelor|Licence|BTS|DUT)/i,
      experience: /^(Développeur|Developpeur|Stage|Consultant)/i,
      formation: /^(Formation)/i,
      projet: /^[A-Z][a-zA-Z0-9\s]+$/
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 2) return;
      
      // Détecter section principale
      let newSectionType: string | null = null;
      for (const [type, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmedLine)) {
          newSectionType = type;
          console.log(`🏷️  Section: ${newSectionType}`);
          break;
        }
      }
      
      // Détecter entrées individuelles dans les sections
      if (!newSectionType && currentSection) {
        // Pour les diplômes
        if (currentSection.type === 'diplomes' && entryPatterns.diplome.test(trimmedLine)) {
          // Sauvegarder le diplôme précédent
          if (currentSection.content.trim()) {
            chunks.push({
              ...currentSection,
              content: currentSection.content.trim()
            });
          }
          
          // Nouveau diplôme
          currentSection = {
            type: 'diplome',
            title: trimmedLine,
            content: '',
            source: filename
          };
          return;
        }
        
        // Pour les expériences
        if (currentSection.type === 'experiences' && entryPatterns.experience.test(trimmedLine)) {
          if (currentSection.content.trim()) {
            chunks.push({
              ...currentSection,
              content: currentSection.content.trim()
            });
          }
          
          currentSection = {
            type: 'experience',
            title: trimmedLine,
            content: '',
            source: filename
          };
          return;
        }
        
        // Pour les formations complémentaires
        if (currentSection.type === 'formations_complementaires' && entryPatterns.formation.test(trimmedLine)) {
          if (currentSection.content.trim()) {
            chunks.push({
              ...currentSection,
              content: currentSection.content.trim()
            });
          }
          
          currentSection = {
            type: 'formation_complementaire',
            title: trimmedLine,
            content: '',
            source: filename
          };
          return;
        }
        
        // Pour les projets
        if (currentSection.type === 'projets' && /^[A-Z]/.test(trimmedLine) && 
            !trimmedLine.includes(':') && trimmedLine.length < 50) {
          if (currentSection.content.trim()) {
            chunks.push({
              ...currentSection,
              content: currentSection.content.trim()
            });
          }
          
          currentSection = {
            type: 'projet',
            title: trimmedLine,
            content: '',
            source: filename
          };
          return;
        }
      }
      
      if (newSectionType) {
        // Sauvegarder section précédente
        if (currentSection && currentSection.content.trim()) {
          chunks.push({
            ...currentSection,
            content: currentSection.content.trim()
          });
        }
        
        // Nouvelle section
        currentSection = {
          type: newSectionType,
          title: trimmedLine,
          content: '',
          source: filename
        };
      } else if (currentSection) {
        // Ajouter à la section courante
        currentSection.content += trimmedLine + '\n';
      }
    });
    
    // Ajouter dernière section
    if (currentSection && currentSection.content.trim()) {
      chunks.push({
        ...currentSection,
        content: currentSection.content.trim()
      });
    }
    
    // Nettoyer et valider
    const validChunks = chunks
      .filter(chunk => chunk.content.trim().length > 5)
      .map(chunk => ({
        ...chunk,
        content: chunk.content.trim(),
        title: chunk.title.trim()
      }));
    
    console.log(`Chunks créés: ${validChunks.length}`);
    
    // Debug: afficher structure
    validChunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. [${chunk.type}] "${chunk.title}"`);
    });
    
    return validChunks;
  }
}

// Embeddings optimisés (développeur full-stack)
class PatrickEmbeddingGenerator {
  static readonly keywords: string[] = [
    // Langages mentionnés dans le CV
    'csharp', 'c#', 'rust', 'typescript', 'javascript', 'python', 'php', 'lua',
    
    // Frameworks & Libraries
    'wpf', 'xaml', 'react', 'reactjs', 'nextjs', 'next.js', 'symfony', 'express',
    'expressjs', 'nodejs', 'node.js', 'bootstrap', 'tailwind', 'tauri',
    
    // Bases de données
    'sql', 'nosql', 'sqlite', 'mongodb',
    
    // Outils & Technologies
    'git', 'docker', 'unity', 'lucene', 'velocity', 'vite', 'json',
    
    // Concepts & Architecture
    'fullstack', 'full-stack', 'frontend', 'backend', 'desktop', 'web',
    'application', 'multiplateforme', 'cross-platform',
    
    // IA & Technologies avancées
    'rag', 'intelligence', 'artificielle', 'ai', 'ia', 'groq',
    
    // Domaines d'expertise
    'développeur', 'developer', 'logiciel', 'software', 'web', 'desktop',
    'bibliothèque', 'library', 'framework', 'api',
    
    // Formation & Expérience
    'master', 'bachelor', 'université', 'genève', 'informatique', 'science',
    'stage', 'développement', 'formation', 'projet', 'technologies',
    'sécurité', 'vérification', 'algorithmique', 'base', 'données',
    'réseaux', 'modélisation',
    
    // Entreprises
    'bontaz', 'gaea21', 'unity', 'coursera',
    
    // Projets spécifiques
    'tailwindwpf', 'portfoliorag', 'importer', 'updater',
    
    // Compétences générales
    'créer', 'développement', 'création', 'mise', 'pratique', 'accent',
    'concepts', 'relatifs', 'mobile', 'systèmes', 'communication',
    'nouvelles', 'information',
    
    // Langues
    'français', 'anglais', 'allemand', 'courant', 'professionnel', 'notions'
  ];

  static generateEmbedding(text: string): number[] {
    const textLower = text.toLowerCase()
      .replace(/[éèê]/g, 'e')
      .replace(/[àâ]/g, 'a')
      .replace(/[ç]/g, 'c')
      .replace(/[îï]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ùûü]/g, 'u');
    
    return this.keywords.map(keyword => {
      // Recherche exacte et variations
      const patterns = [
        `\\b${keyword}\\b`,
        keyword.replace(/[.\-]/g, ''),
        keyword.replace('js', 'javascript'),
        keyword.replace('csharp', 'c#')
      ];
      
      let totalMatches = 0;
      patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'gi');
        const matches = textLower.match(regex) || [];
        totalMatches += matches.length;
      });
      
      // Normalisation avec boost pour mots importants
      const textLength = Math.max(text.length / 150, 1);
      let score = totalMatches / textLength;
      
      // Boost pour technologies principales
      const boostKeywords = ['react', 'typescript', 'javascript', 'csharp', 'rust', 'nextjs', 'wpf'];
      if (boostKeywords.some(boost => keyword.includes(boost))) {
        score *= 1.3;
      }
      
      return Math.min(score, 1.0);
    });
  }
}

// Build principal
async function buildIndex(): Promise<SearchIndex> {
  try {
    console.log('Vérification des dossiers...');
    
    // Créer dossiers
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(DOCUMENTS_DIR)) {
      fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
      console.error(`Créez le dossier: ${DOCUMENTS_DIR}`);
      process.exit(1);
    }
    
    // Chercher cv.txt
    const files = fs.readdirSync(DOCUMENTS_DIR);
    const cvFile = files.find(f => f.toLowerCase().includes('cv') && f.endsWith('.txt'));
    
    if (!cvFile) {
      console.error('Fichier cv.txt introuvable !');
      console.log(`Placez cv.txt dans: ${DOCUMENTS_DIR}`);
      process.exit(1);
    }
    
    console.log(`Fichier CV trouvé: ${cvFile}`);

    const documents: DocumentInfo[] = [];
    const allChunks: ChunkMetadata[] = [];
    
    // Traitement du CV
    const filePath = path.join(DOCUMENTS_DIR, cvFile);
    console.log(`\nTraitement: ${cvFile}`);
    
    const text = PatrickCVParser.extractText(filePath);
    const rawChunks = PatrickCVChunker.chunk(text, cvFile);
    
    console.log(`\nGénération embeddings...`);
    const chunksWithEmbeddings: ChunkMetadata[] = rawChunks.map((chunk, index) => {
      const embedding = PatrickEmbeddingGenerator.generateEmbedding(chunk.content + ' ' + chunk.title);
      
      return {
        id: `${cvFile}_${index}`,
        type: chunk.type,
        title: chunk.title,
        content: chunk.content,
        source: chunk.source,
        wordCount: chunk.content.split(/\s+/).length,
        embedding
      };
    });
    
    documents.push({
      filename: cvFile,
      processedAt: new Date().toISOString(),
      chunksCount: rawChunks.length,
      sections: [...new Set(rawChunks.map(c => c.type))]
    });
    
    allChunks.push(...chunksWithEmbeddings);

    // Créer index
    const index: SearchIndex = {
      version: '1.0',
      buildAt: new Date().toISOString(),
      totalDocuments: documents.length,
      totalChunks: allChunks.length,
      embeddingDimensions: PatrickEmbeddingGenerator.keywords.length,
      documents,
      chunks: allChunks,
      searchConfig: {
        defaultTopK: 4,
        minSimilarity: 0.05, // Plus permissif pour avoir plus de contexte
        keywords: PatrickEmbeddingGenerator.keywords
      }
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
    
    console.log(`\nINDEX CRÉÉ !\n`);
    console.log(`Statistiques:`);
    console.log(`   Documents: ${documents.length}`);
    console.log(`   Chunks: ${allChunks.length}`);
    console.log(`   Dimensions: ${PatrickEmbeddingGenerator.keywords.length}`);
    console.log(`   Taille: ${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB`);
    
    console.log(`\nSections détectées:`);
    const sections = [...new Set(allChunks.map(c => c.type))];
    sections.forEach(section => {
      const count = allChunks.filter(c => c.type === section).length;
      console.log(`   🏷️  ${section}: ${count} chunks`);
    });
    
    console.log(`\nChunks créés:`);
    allChunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. [${chunk.type}] "${chunk.title.substring(0, 40)}..." (${chunk.wordCount} mots)`);
    });

    return index;

  } catch (error) {
    console.error('\nErreur:', error);
    process.exit(1);
  }
}

buildIndex().then(() => {
  console.log('\nIndex prêt.');
  process.exit(0);
});