import searchIndex from '@/data/processed/index.json';
import type { SearchIndex, ChunkMetadata } from '../../scripts/build-index';

// Types pour les résultats de recherche
interface SearchResult {
  content: string;
  similarity: number;
  source: string;
  type: string;
  title: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  context: string;
  sources: SearchSource[];
  hasResults: boolean;
  stats?: {
    totalChunks: number;
    checkedChunks: number;
    foundChunks: number;
  };
}

interface SearchSource {
  index: number;
  title: string;
  type: string;
  source: string;
  similarity: number;
  preview: string;
  wordCount?: number;
}

interface SearchOptions {
  topK?: number;
  minSimilarity?: number;
  boostRecent?: boolean;
  boostSections?: boolean;
}

interface SimilarityResult {
  index: number;
  chunk: ChunkMetadata;
  similarity: number;
  originalSimilarity: number;
}

interface ExpandedSearchResponse extends SearchResponse {
  expandedQueries: string[];
}

class SearchEngine {
  private index: SearchIndex;
  private keywords: string[];

  constructor() {
    this.index = searchIndex as SearchIndex;
    this.keywords = this.index.searchConfig.keywords;
  }

  // Génération embedding côté client (même logique que build)
  generateEmbedding(text: string): number[] {
    const textLower = text.toLowerCase();
    
    return this.keywords.map(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textLower.match(regex) || [];
      const frequency = matches.length;
      const normalizedFreq = frequency / (text.length / 100);
      return Math.min(normalizedFreq, 1.0);
    });
  }

  // Similarité cosinus
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return Math.max(0, Math.min(1, dotProduct / (magnitudeA * magnitudeB)));
  }

  // Recherche principale
  search(query: string, options: SearchOptions = {}): SearchResponse {
    const {
      topK = 4,                    // Plus de résultats
      minSimilarity = 0.03,        // Seuil plus bas pour plus de contexte
      boostRecent = true,
      boostSections = true
    } = options;

    if (!query || !query.trim()) {
      return {
        query: '',
        results: [],
        context: '',
        sources: [],
        hasResults: false
      };
    }

    // Générer embedding de la requête
    const queryEmbedding = this.generateEmbedding(query);
    
    // Calculer similarités
    const similarities: SimilarityResult[] = this.index.chunks.map((chunk, index) => {
      let similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      // Boost pour correspondances exactes de mots-clés
      if (boostSections) {
        similarity = this.applyBoosts(query, chunk, similarity);
      }
      
      return {
        index,
        chunk,
        similarity,
        originalSimilarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      };
    });

    // Filtrer et trier
    const results = similarities
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // Construire contexte
    const context = this.buildContext(results);
    const sources = this.extractSources(results);

    return {
      query,
      results: results.map(r => ({
        content: r.chunk.content,
        similarity: r.similarity,
        source: r.chunk.source,
        type: r.chunk.type,
        title: r.chunk.title
      })),
      context,
      sources,
      hasResults: results.length > 0,
      stats: {
        totalChunks: this.index.chunks.length,
        checkedChunks: similarities.length,
        foundChunks: results.length
      }
    };
  }

  // Système de boost pour améliorer pertinence
  private applyBoosts(query: string, chunk: ChunkMetadata, baseSimilarity: number): number {
    let boostedSimilarity = baseSimilarity;
    
    // Boost par type de section 
    const sectionBoosts: Record<string, number> = {
      'experience': 1.3,        // Expériences professionnelles prioritaires
      'projet': 1.25,          // Projets importants  
      'competences': 1.2,      // Compétences techniques
      'diplome': 1.15,         // Formation
      'formation_complementaire': 1.1,
      'profil': 1.05,          // Présentation
      'langues': 0.9
    };
    
    if (sectionBoosts[chunk.type]) {
      boostedSimilarity *= sectionBoosts[chunk.type];
    }

    // Boost pour correspondances exactes de technologies de Patrick
    const patrickTechs = [
      'c#', 'csharp', 'rust', 'react', 'typescript', 'javascript', 
      'wpf', 'xaml', 'nextjs', 'tailwind', 'symfony', 'nodejs',
      'sqlite', 'unity', 'tauri', 'genève', 'bontaz', 'gaea21'
    ];
    
    const queryLower = query.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    
    const techMatches = patrickTechs.filter(tech => 
      queryLower.includes(tech) && contentLower.includes(tech)
    ).length;
    
    if (techMatches > 0) {
      boostedSimilarity *= (1 + techMatches * 0.15);
    }

    // Boost pour correspondances titre vs contenu
    const titleLower = chunk.title.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const titleMatches = queryWords.filter(word => titleLower.includes(word)).length;
    if (titleMatches > 0) {
      boostedSimilarity *= (1 + titleMatches * 0.1);
    }

    return Math.min(boostedSimilarity, 1.0);
  }

  // Construction du contexte pour l'IA
  private buildContext(results: SimilarityResult[]): string {
    if (results.length === 0) return '';

    const maxContextLength = 2000; // Augmenté pour plus de contexte
    let context = '';
    let currentLength = 0;

    // Organiser par type de section pour un contexte logique
    const sectionOrder = ['profil', 'experience', 'projet', 'competences', 'diplome', 'formation_complementaire', 'langues'];
    
    const organizedResults = results.sort((a, b) => {
      const orderA = sectionOrder.indexOf(a.chunk.type) !== -1 ? sectionOrder.indexOf(a.chunk.type) : 999;
      const orderB = sectionOrder.indexOf(b.chunk.type) !== -1 ? sectionOrder.indexOf(b.chunk.type) : 999;
      
      if (orderA !== orderB) return orderA - orderB;
      return b.similarity - a.similarity;
    });

    for (const result of organizedResults) {
      const chunkHeader = `[${result.chunk.title}]`;
      const chunkContent = `${chunkHeader}\n${result.chunk.content}`;
      const chunkWithSeparator = chunkContent + '\n\n';

      if (currentLength + chunkWithSeparator.length > maxContextLength && context.length > 0) {
        break;
      }

      context += (context ? '\n\n' : '') + chunkContent;
      currentLength += chunkWithSeparator.length;
    }

    return context.trim();
  }

  // Extraction des sources pour affichage
  private extractSources(results: SimilarityResult[]): SearchSource[] {
    return results.map((result, index) => ({
      index: index + 1,
      title: result.chunk.title || `Section ${index + 1}`,
      type: result.chunk.type,
      source: result.chunk.source,
      similarity: Math.round(result.similarity * 100),
      preview: result.chunk.content.substring(0, 100) + 
               (result.chunk.content.length > 100 ? '...' : ''),
      wordCount: result.chunk.wordCount || result.chunk.content.split(' ').length
    }));
  }

  // Recherche avec expansion de requête
  searchWithExpansion(query: string, options: SearchOptions = {}): ExpandedSearchResponse {
    // Synonymes techniques pour améliorer recherche
    const expansions: Record<string, string[]> = {
      'dev': ['développeur', 'developer', 'développement'],
      'js': ['javascript'],
      'ts': ['typescript'],
      'ai': ['intelligence artificielle', 'ia'],
      'ml': ['machine learning', 'apprentissage automatique'],
      'frontend': ['front-end', 'interface utilisateur'],
      'backend': ['back-end', 'serveur'],
      'fullstack': ['full-stack', 'développeur complet']
    };

    // Créer requêtes étendues
    const queries = [query];
    const queryLower = query.toLowerCase();
    
    for (const [abbrev, synonyms] of Object.entries(expansions)) {
      if (queryLower.includes(abbrev)) {
        synonyms.forEach(synonym => {
          const expandedQuery = query.replace(new RegExp(abbrev, 'gi'), synonym);
          if (!queries.includes(expandedQuery)) {
            queries.push(expandedQuery);
          }
        });
      }
    }

    // Rechercher avec toutes les variantes
    const allResults: SearchResult[] = [];
    const seenChunks = new Set<string>();

    for (const q of queries.slice(0, 3)) { // Limiter à 3 variantes
      const searchResult = this.search(q, { ...options, topK: 5 });
      
      searchResult.results.forEach(result => {
        const chunkKey = `${result.source}_${result.content.substring(0, 50)}`;
        if (!seenChunks.has(chunkKey)) {
          seenChunks.add(chunkKey);
          allResults.push(result);
        }
      });
    }

    // Trier et limiter
    const finalResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.topK || 3);

    return {
      query,
      expandedQueries: queries,
      results: finalResults,
      context: this.buildContextFromResults(finalResults),
      sources: this.extractSourcesFromResults(finalResults),
      hasResults: finalResults.length > 0
    };
  }

  // Helpers pour recherche étendue
  private buildContextFromResults(results: SearchResult[]): string {
    return results.map(r => r.content).join('\n\n');
  }

  private extractSourcesFromResults(results: SearchResult[]): SearchSource[] {
    return results.map((result, index) => ({
      index: index + 1,
      title: result.title,
      type: result.type,
      source: result.source,
      similarity: Math.round(result.similarity * 100),
      preview: result.content.substring(0, 100) + '...'
    }));
  }

  // Suggestions de questions basées sur le contenu
  getSuggestions(): string[] {
    return [
      "Quel est ton parcours professionnel ?",
      "Quelles technologies maîtrises-tu ?",
      "Parle-moi de tes projets personnels",
      "Quelle est ta formation ?",
      "Où as-tu travaillé ?",
      "Quels sont tes projets WPF et Rust ?",
      "Ton expérience avec React et TypeScript ?",
      "Tes formations complémentaires ?",
      "Comment te contacter ?",
      "Tes compétences en intelligence artificielle ?"
    ];
  }

  // Statistiques de l'index
  getIndexStats(): {
    totalDocuments: number;
    totalChunks: number;
    embeddingDimensions: number;
    buildAt: string;
    documents: any[];
  } {
    return {
      totalDocuments: this.index.totalDocuments,
      totalChunks: this.index.totalChunks,
      embeddingDimensions: this.index.embeddingDimensions,
      buildAt: this.index.buildAt,
      documents: this.index.documents
    };
  }

  // Test de performance
  benchmark(queries: string[] = []): {
    averageDuration: number;
    totalQueries: number;
    results: Array<{
      query: string;
      duration: number;
      resultsCount: number;
      hasResults: boolean;
    }>;
  } {
    const testQueries = queries.length > 0 ? queries : [
      'expérience React',
      'compétences JavaScript',
      'projets IA',
      'formation développement'
    ];

    const results = testQueries.map(query => {
      const start = performance.now();
      const searchResult = this.search(query);
      const end = performance.now();
      
      return {
        query,
        duration: Math.round(end - start),
        resultsCount: searchResult.results.length,
        hasResults: searchResult.hasResults
      };
    });

    return {
      averageDuration: Math.round(
        results.reduce((sum, r) => sum + r.duration, 0) / results.length
      ),
      totalQueries: results.length,
      results
    };
  }
}

// Instance singleton
const searchEngine = new SearchEngine();

export default searchEngine;
export { SearchEngine };
export type { SearchResult, SearchResponse, SearchSource, SearchOptions, ExpandedSearchResponse };