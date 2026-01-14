import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Answer, 
  saveAnswer, 
  getAllAnswers, 
  clearAllAnswers, 
  bulkSaveAnswers, 
  initializeDatabase, 
  getSelectedFrameworks, 
  setSelectedFrameworks as dbSetSelectedFrameworks,
  getEnabledFrameworks,
  setEnabledFrameworks as dbSetEnabledFrameworks,
  getAllCustomQuestions,
  getDisabledQuestions
} from './database';
import { fetchQuestions, Question } from './datasetData';
import { fetchFrameworks, getDefaultEnabledFrameworks, getPrimaryFrameworkId } from './frameworksData';

interface AnswersState {
  answers: Map<string, Answer>;
  isLoading: boolean;
  lastUpdated: string | null;
  enabledFrameworks: string[];
  selectedFrameworks: string[];
  
  loadAnswers: () => Promise<void>;
  setAnswer: (questionId: string, updates: Partial<Omit<Answer, 'questionId' | 'frameworkId'>>) => Promise<void>;
  clearAnswers: () => Promise<void>;
  importAnswers: (newAnswers: Answer[]) => Promise<void>;
  generateDemoData: () => Promise<void>;
  getAnswer: (questionId: string) => Answer | undefined;
  setEnabledFrameworks: (frameworkIds: string[]) => Promise<void>;
  setSelectedFrameworks: (frameworkIds: string[]) => Promise<void>;
  getAnswersByFramework: (frameworkId: string) => Answer[];
}

export const useAnswersStore = create<AnswersState>()((set, get) => ({
  answers: new Map(),
  isLoading: true,
  lastUpdated: null,
  enabledFrameworks: [],
  selectedFrameworks: [],

  loadAnswers: async () => {
    set({ isLoading: true });
    try {
      await initializeDatabase();
      const storedAnswers = await getAllAnswers();
      const answersMap = new Map<string, Answer>();
      storedAnswers.forEach(a => answersMap.set(a.questionId, a));
      
      const enabledFw = await getEnabledFrameworks();
      const selectedFw = await getSelectedFrameworks();
      
      // Get default enabled frameworks from database
      const defaultEnabled = await getDefaultEnabledFrameworks();
      const defaultEnabledIds = defaultEnabled.map(f => f.frameworkId);
      
      set({ 
        answers: answersMap, 
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        enabledFrameworks: enabledFw.length > 0 ? enabledFw : defaultEnabledIds,
        selectedFrameworks: selectedFw
      });
    } catch (error) {
      console.error('Error loading answers:', error);
      set({ isLoading: false });
    }
  },

  setAnswer: async (questionId: string, updates: Partial<Omit<Answer, 'questionId' | 'frameworkId'>>) => {
    const currentAnswer = get().answers.get(questionId);
    
    // Load questions from database to get frameworkId
    const questions = await fetchQuestions();
    const question = questions.find(q => q.questionId === questionId);
    const frameworkId = currentAnswer?.frameworkId || 
                        (question ? getPrimaryFrameworkId(question.frameworks) : null) || 
                        'NIST_AI_RMF';
    
    const newAnswer: Answer = {
      questionId,
      frameworkId,
      response: updates.response ?? currentAnswer?.response ?? null,
      evidenceOk: updates.evidenceOk ?? currentAnswer?.evidenceOk ?? null,
      notes: updates.notes ?? currentAnswer?.notes ?? '',
      evidenceLinks: updates.evidenceLinks ?? currentAnswer?.evidenceLinks ?? [],
      updatedAt: new Date().toISOString(),
    };

    const newAnswers = new Map(get().answers);
    newAnswers.set(questionId, newAnswer);
    set({ answers: newAnswers, lastUpdated: new Date().toISOString() });

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

    // Load questions from database
    const [dbQuestions, customQuestions, disabledQuestionIds] = await Promise.all([
      fetchQuestions(),
      getAllCustomQuestions(),
      getDisabledQuestions()
    ]);

    // Combine default and custom questions, excluding disabled ones
    const allQuestions: Question[] = [
      ...dbQuestions.filter(q => !disabledQuestionIds.includes(q.questionId)),
      ...customQuestions
        .filter(q => !q.isDisabled)
        .map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          subcatId: q.subcatId || '',
          domainId: q.domainId,
          expectedEvidence: q.expectedEvidence || '',
          imperativeChecks: q.imperativeChecks || '',
          riskSummary: q.riskSummary || '',
          frameworks: q.frameworks || [],
          ownershipType: q.ownershipType as Question['ownershipType']
        }))
    ];

    allQuestions.forEach((q) => {
      const rand = Math.random();
      let response: Answer['response'];
      if (rand < 0.35) response = 'Sim';
      else if (rand < 0.65) response = 'Parcial';
      else if (rand < 0.88) response = 'Não';
      else response = 'NA';

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

      // Get the primary framework from the question's frameworks array
      const frameworkId = getPrimaryFrameworkId(q.frameworks) || 'NIST_AI_RMF';

      demoAnswers.push({
        questionId: q.questionId,
        frameworkId,
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

  setEnabledFrameworks: async (frameworkIds: string[]) => {
    set({ enabledFrameworks: frameworkIds });
    try {
      await dbSetEnabledFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving enabled frameworks:', error);
    }
  },

  setSelectedFrameworks: async (frameworkIds: string[]) => {
    set({ selectedFrameworks: frameworkIds });
    try {
      await dbSetSelectedFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving selected frameworks:', error);
    }
  },

  getAnswersByFramework: (frameworkId: string) => {
    const answers = Array.from(get().answers.values());
    return answers.filter(a => a.frameworkId === frameworkId);
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
