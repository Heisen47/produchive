export type GoalRole = 
    | 'Software Engineer' 
    | 'Law Student' 
    | 'Medical Student' 
    | 'Engineering Student' 
    | 'General Student';

export const GOAL_ROLES: GoalRole[] = [
    'Software Engineer',
    'Law Student',
    'Medical Student',
    'Engineering Student',
    'General Student'
];

export const GOAL_SUGGESTIONS_BY_ROLE: Record<GoalRole, string[]> = {
    'Software Engineer': [
        'Complete coding project',
        'Study for 2 hours',
        'Write documentation',
        'Review pull requests',
        'Read technical articles',
        'Practice DSA problems',
        'Work on side project',
        'Clear email inbox',
        'Design new feature',
        'Fix outstanding bugs',
    ],
    'Law Student': [
        'Read case law summaries',
        'Draft legal memorandum',
        'Review contracts',
        'Prepare for moot court',
        'Study constitutional law',
        'Research legal precedents',
        'Write case briefs',
        'Practice legal arguments',
        'Review statutes',
        'Attend study group'
    ],
    'Medical Student': [
        'Review anatomy flashcards',
        'Study pathology',
        'Practice clinical skills',
        'Read medical journals',
        'Prepare for rounds',
        'Watch surgical videos',
        'Review pharmacology',
        'Practice patient history',
        'Study for USMLE/Boards',
        'Research medical cases'
    ],
    'Engineering Student': [
        'Solve mechanics problems',
        'Complete lab report',
        'Study thermodynamics',
        'Design CAD model',
        'Review circuit diagrams',
        'Practice heavy math',
        'Code MATLAB simulation',
        'Work on capstone project',
        'Study material science',
        'Review engineering ethics'
    ],
    'General Student': [
        'Complete assignment',
        'Study for exam',
        'Read textbook chapter',
        'Write essay',
        'Research for paper',
        'Review lecture notes',
        'Attend online class',
        'Practice presentation',
        'Deep work session',
        'Organize study materials'
    ]
};
