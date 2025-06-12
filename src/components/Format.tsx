const formatPatrickResponse = (text: string) => {
  let formattedText = text;

  // 1. MARKDOWN DE BASE - transformation ** en strong
  formattedText = formattedText
    // Texte en gras entre **texte** ou *texte*
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Texte en italique entre _texte_
    .replace(/_([^_\n]+?)_/g, '<em class="text-gray-300 italic">$1</em>')
    // Code entre `code`
    .replace(/`([^`\n]+?)`/g, '<code class="bg-gray-700 text-green-300 px-1 rounded text-sm">$1</code>');

  // 2. DIPLÔMES EN PREMIER (avant les autres regex) - Cyan
  formattedText = formattedText.replace(
    /\b(Master|Bachelor)(\s+en\s+Science\s+Informatique|\s+en\s+[A-Za-zÀ-ÿ\s]+)/gi,
    (match, degree, subject) => 
      `<span class="text-cyan-400 font-semibold">${degree}</span><span class="text-gray-300">${subject}</span>`
  );

  // 3. TECHNOLOGIES - Couleurs simples 
  const techColors = {
    // Langages principaux - Rouge
    languages: {
      pattern: /\b(C#|Rust|TypeScript|JavaScript|Python|PHP|Lua)\b/gi,
      color: 'text-red-400 font-medium'
    },
    // Frameworks Frontend - Bleu
    frontend: {
      pattern: /\b(React|Next\.js|WPF|XAML|Tailwind|Bootstrap|HTML|CSS)\b/gi,
      color: 'text-blue-400 font-medium'
    },
    // Backend/Tools - Vert
    backend: {
      pattern: /\b(Node\.js|Express\.js|Symfony|Unity|Docker|Git|SQLite|MongoDB|Tauri|Vite)\b/gi,
      color: 'text-green-400 font-medium'
    },
    // IA/Advanced - Violet (exclure "ai" isolé qui cause des problèmes)
    ai: {
      pattern: /\b(RAG|Groq|Intelligence Artificielle|Vector|Embedding)\b/gi,
      color: 'text-purple-400 font-medium'
    }
  };

  // Appliquer les couleurs technologiques
  Object.entries(techColors).forEach(([category, config]) => {
    formattedText = formattedText.replace(config.pattern, (match) => 
      `<span class="${config.color}">${match}</span>`
    );
  });

  // 4. DATES - Couleur jaune
  formattedText = formattedText.replace(
    /\b(depuis\s+)?(\d{4})(\s*[-–]\s*(\d{4}|présent|aujourd'hui))?\b/gi,
    (match) => `<span class="text-yellow-400 font-medium">${match}</span>`
  );

  // 5. ENTREPRISES ET INSTITUTIONS - Couleurs distinctes
  formattedText = formattedText
    // Entreprises - Indigo
    .replace(/\b(Bontaz|Gaea21|Unity Technologies)\b/gi, 
      (match) => `<span class="text-indigo-400 font-semibold">${match}</span>`)
    // Universités - Emeraude
    .replace(/\b(Université de Genève|Coursera)\b/gi, 
      (match) => `<span class="text-emerald-400 font-semibold">${match}</span>`);

  // 6. PROJETS - Rose/Magenta
  const projects = ['TailwindWPF', 'PortfolioRAG', 'JSON-SQLite', 'Importer', 'Updater'];
  projects.forEach(project => {
    const pattern = new RegExp(`\\b(${project})\\b`, 'gi');
    formattedText = formattedText.replace(pattern, (match) => 
      `<span class="text-pink-400 font-semibold">${match}</span>`
    );
  });

  // 7. RÔLES PROFESSIONNELS - Orange
  formattedText = formattedText.replace(
    /\b(Développeur|Developer)\s+(logiciel|full\s*stack|Full-Stack)/gi,
    (match) => `<span class="text-orange-400 font-semibold">${match}</span>`
  );

  // 8. LANGUES - Couleurs nationales
  formattedText = formattedText
    .replace(/\bFrançais\b/gi, (match) => `<span class="text-blue-300 font-medium">${match}</span>`)
    .replace(/\bAnglais\b/gi, (match) => `<span class="text-red-300 font-medium">${match}</span>`)
    .replace(/\bAllemand\b/gi, (match) => `<span class="text-yellow-300 font-medium">${match}</span>`);

  // 9. NIVEAUX DE COMPÉTENCE - Couleurs graduées
  formattedText = formattedText
    .replace(/\bcourant\b/gi, (match) => `<span class="text-green-400 font-medium">${match}</span>`)
    .replace(/\bprofessionnel\b/gi, (match) => `<span class="text-blue-400 font-medium">${match}</span>`)
    .replace(/\bnotions\b/gi, (match) => `<span class="text-yellow-400 font-medium">${match}</span>`);

  // 10. MOTS-CLÉS MÉTIER - Gris clair
  const keywords = [
    'développement', 'architecture', 'sécurité', 'performance', 
    'optimisation', 'stage', 'formation', 'mission', 'projets',
    'technologies', 'application', 'système', 'données'
  ];
  
  keywords.forEach(keyword => {
    const pattern = new RegExp(`\\b(${keyword}s?)\\b`, 'gi');
    formattedText = formattedText.replace(pattern, (match) => 
      `<span class="text-gray-100 font-medium">${match}</span>`
    );
  });

  // 11. STRUCTURE - Listes simples
  formattedText = formattedText
    // Listes avec puces
    .replace(/^[\s]*[•\-\*]\s*(.+)$/gm, 
      '<div class="flex items-start gap-2 my-1"><span class="text-blue-400 mt-1">•</span><span class="text-gray-300">$1</span></div>')
    
    // Nettoyer les * restants isolés
    .replace(/(?:^|\s)\*(?:\s|$)/g, ' ')
    
    // Paragraphes simples
    .replace(/\n\n/g, '</p><p class="text-gray-300 leading-relaxed mb-3">');

  // Encapsuler dans un paragraphe si nécessaire
  if (!formattedText.startsWith('<')) {
    formattedText = '<p class="text-gray-300 leading-relaxed mb-3">' + formattedText + '</p>';
  }

  return formattedText;
};


export { formatPatrickResponse };