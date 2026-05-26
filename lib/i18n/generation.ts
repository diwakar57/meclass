export const generationEnUS = {
  classroom: {
    recentClassrooms: 'Recent',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    slides: 'slides',
    nameCopied: 'Name copied',
    deleteConfirmTitle: 'Delete',
    delete: 'Delete',
  },
  upload: {
    pdfSizeLimit: 'Supports PDF files up to 50MB',
    generateFailed: 'Failed to generate classroom, please try again',
    requirementPlaceholder:
      'Tell me anything you want to learn, e.g.\n"Teach me Python from scratch in 30 minutes"\n"Explain Fourier Transform on the whiteboard"\n"How to play the board game Avalon"',
    requirementRequired: 'Please enter course requirements',
    fileTooLarge: 'File too large. Please select a PDF file smaller than 50MB',
  },
  generation: {
    // Progress steps (used dynamically via activeStep)
    analyzingPdf: 'Analyzing PDF Document',
    analyzingPdfDesc: 'Extracting document structure and content...',
    pdfLoadFailed: 'Failed to load PDF file, please try again',
    pdfParseFailed: 'PDF parsing failed',
    streamNotReadable: 'Unable to read generation stream',
    generatingOutlines: 'Drafting Course Outline',
    generatingOutlinesDesc: 'Structuring the learning path...',
    generatingSlideContent: 'Generating Page Content',
    generatingSlideContentDesc: 'Creating slides, quizzes, and interactive content...',
    generatingActions: 'Generating Teaching Actions',
    generatingActionsDesc: 'Orchestrating narration, spotlights, and interactions...',
    generationComplete: 'Generation complete!',
    generationFailed: 'Generation failed',
    generatingCourse: 'Generating course',
    openingClassroom: 'Opening classroom...',
    outlineReady: 'Course outline generated',
    generatingFirstPage: 'Generating first page...',
    firstPageReady: 'First page ready! Opening classroom...',
    speechFailed: 'Speech generation failed',
    retryScene: 'Retry',
    retryingScene: 'Regenerating...',
    backToHome: 'Back to Home',
    sessionNotFound: 'Session Not Found',
    sessionNotFoundDesc: 'Please fill in course requirements to start the generation process.',
    goBackAndRetry: 'Go Back and Retry',
    classroomReady: 'Your personalized AI learning environment has been generated successfully.',
    aiWorking: 'AI Agents Working...',
    textTruncated: 'Document text is long, using first {n} characters for generation',
    imageTruncated:
      '{total} images found, exceeding the {max} image limit. Extra images will use text descriptions only',
    // Agent generation
    agentGeneration: 'Generating Classroom Roles',
    agentGenerationDesc: 'Generating roles based on course content...',
    agentRevealTitle: 'Your Classroom Roles',
    viewAgents: 'View Roles',
    continue: 'Continue',
    // Outline errors
    outlineRetrying: 'Outline generation issue, retrying...',
    outlineEmptyResponse:
      'Model returned no valid outlines. Please check model configuration and try again',
    outlineGenerateFailed: 'Outline generation failed, please try again later',
    // Web Search
    webSearching: 'Web Search',
    webSearchingDesc: 'Searching the web for up-to-date information',
    webSearchFailed: 'Web search failed',
  },
} as const;

export const generationZhCN = generationEnUS;
