import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Answer, db, saveAnswer, getAllAnswers, clearAllAnswers, bulkSaveAnswers, initializeDatabase } from './database';
import { questions } from './dataset';

interface AnswersState {
  answers: Map<string, Answer>;
  isLoading: boolean;
  lastUpdated: string | null;
  
  // Actions
  loadAnswers: () => Promise<void>;
  setAnswer: (questionId: string, updates: Partial<Answer>) => Promise<void>;
  clearAnswers: () => Promise<void>;
  importAnswers: (newAnswers: Answer[]) => Promise<void>;
  generateDemoData: () => Promise<void>;
  getAnswer: (questionId: string) => Answer | undefined;
}

export const useAnswersStore = create<AnswersState>()((set, get) => ({
  answers: new Map(),
  isLoading: true,
  lastUpdated: null,

  loadAnswers: async () => {
    set({ isLoading: true });
    try {
      await initializeDatabase();
      const storedAnswers = await getAllAnswers();
      const answersMap = new Map<string, Answer>();
      storedAnswers.forEach(a => answersMap.set(a.questionId, a));
      
      set({ 
        answers: answersMap, 
        isLoading: false,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading answers:', error);
      set({ isLoading: false });
    }
  },

  setAnswer: async (questionId: string, updates: Partial<Answer>) => {
    const currentAnswer = get().answers.get(questionId);
    const newAnswer: Answer = {
      questionId,
      response: updates.response ?? currentAnswer?.response ?? null,
      evidenceOk: updates.evidenceOk ?? currentAnswer?.evidenceOk ?? null,
      notes: updates.notes ?? currentAnswer?.notes ?? '',
      evidenceLinks: updates.evidenceLinks ?? currentAnswer?.evidenceLinks ?? [],
      updatedAt: new Date().toISOString(),
    };

    // Update local state immediately
    const newAnswers = new Map(get().answers);
    newAnswers.set(questionId, newAnswer);
    set({ answers: newAnswers, lastUpdated: new Date().toISOString() });

    // Persist to IndexedDB
    try {
      await saveAnswer(newAnswer);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  },

  clearAnswers: async () => {
    set({ answers: new Map(), lastUpdated: new Date().toISOString() });
    try {
      await clearAllAnswers();
    } catch (error) {
      console.error('Error clearing answers:', error);
    }
  },

  importAnswers: async (newAnswers: Answer[]) => {
    const answersMap = new Map<string, Answer>();
    newAnswers.forEach(a => answersMap.set(a.questionId, a));
    
    set({ answers: answersMap, lastUpdated: new Date().toISOString() });
    
    try {
      await clearAllAnswers();
      await bulkSaveAnswers(newAnswers);
    } catch (error) {
      console.error('Error importing answers:', error);
    }
  },

  generateDemoData: async () => {
    const demoAnswers: Answer[] = [];
    const responses: Answer['response'][] = ['Sim', 'Parcial', 'Não', 'NA'];
    const evidences: Answer['evidenceOk'][] = ['Sim', 'Parcial', 'Não', 'NA'];

    questions.forEach((q, index) => {
      // Generate somewhat realistic distribution
      // ~40% Sim, ~30% Parcial, ~20% Não, ~10% NA
      const rand = Math.random();
      let response: Answer['response'];
      if (rand < 0.35) response = 'Sim';
      else if (rand < 0.65) response = 'Parcial';
      else if (rand < 0.88) response = 'Não';
      else response = 'NA';

      // Evidence slightly better than response
      let evidenceOk: Answer['evidenceOk'] = null;
      if (response !== 'NA') {
        const evidRand = Math.random();
        if (response === 'Sim') {
          evidenceOk = evidRand < 0.6 ? 'Sim' : evidRand < 0.9 ? 'Parcial' : 'Não';
        } else if (response === 'Parcial') {
          evidenceOk = evidRand < 0.3 ? 'Sim' : evidRand < 0.7 ? 'Parcial' : 'Não';
        } else {
          evidenceOk = evidRand < 0.2 ? 'Parcial' : 'Não';
        }
      }

      demoAnswers.push({
        questionId: q.questionId,
        response,
        evidenceOk,
        notes: response === 'Não' ? 'Pendente de implementação' : '',
        evidenceLinks: response === 'Sim' ? ['https://docs.example.com/policy'] : [],
        updatedAt: new Date().toISOString(),
      });
    });

    await get().importAnswers(demoAnswers);
  },

  getAnswer: (questionId: string) => {
    return get().answers.get(questionId);
  },
}));

// Filter store
interface FiltersState {
  selectedDomains: string[];
  selectedSubcategories: string[];
  selectedCriticalities: string[];
  scoreRange: [number, number];
  showIncompleteOnly: boolean;
  excludeNA: boolean;
  searchQuery: string;

  // Actions
  setSelectedDomains: (domains: string[]) => void;
  setSelectedSubcategories: (subcats: string[]) => void;
  setSelectedCriticalities: (criticalities: string[]) => void;
  setScoreRange: (range: [number, number]) => void;
  setShowIncompleteOnly: (value: boolean) => void;
  setExcludeNA: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const defaultFilters = {
  selectedDomains: [],
  selectedSubcategories: [],
  selectedCriticalities: [],
  scoreRange: [0, 1] as [number, number],
  showIncompleteOnly: false,
  excludeNA: true,
  searchQuery: '',
};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      ...defaultFilters,

      setSelectedDomains: (domains) => set({ selectedDomains: domains }),
      setSelectedSubcategories: (subcats) => set({ selectedSubcategories: subcats }),
      setSelectedCriticalities: (criticalities) => set({ selectedCriticalities: criticalities }),
      setScoreRange: (range) => set({ scoreRange: range }),
      setShowIncompleteOnly: (value) => set({ showIncompleteOnly: value }),
      setExcludeNA: (value) => set({ excludeNA: value }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      resetFilters: () => set(defaultFilters),
    }),
    {
      name: 'assessment-filters',
    }
  )
);

// Navigation store
interface NavigationState {
  currentDomainId: string | null;
  currentSubcatId: string | null;
  sidebarExpanded: Record<string, boolean>;

  setCurrentDomain: (domainId: string | null) => void;
  setCurrentSubcat: (subcatId: string | null) => void;
  toggleDomainExpanded: (domainId: string) => void;
  setDomainExpanded: (domainId: string, expanded: boolean) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      currentDomainId: null,
      currentSubcatId: null,
      sidebarExpanded: {},

      setCurrentDomain: (domainId) => set({ currentDomainId: domainId, currentSubcatId: null }),
      setCurrentSubcat: (subcatId) => set({ currentSubcatId: subcatId }),
      toggleDomainExpanded: (domainId) => {
        const current = get().sidebarExpanded[domainId] ?? false;
        set({ 
          sidebarExpanded: { 
            ...get().sidebarExpanded, 
            [domainId]: !current 
          } 
        });
      },
      setDomainExpanded: (domainId, expanded) => {
        set({ 
          sidebarExpanded: { 
            ...get().sidebarExpanded, 
            [domainId]: expanded 
          } 
        });
      },
    }),
    {
      name: 'assessment-navigation',
    }
  )
);
