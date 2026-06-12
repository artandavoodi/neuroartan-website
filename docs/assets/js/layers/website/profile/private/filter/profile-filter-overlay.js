import {
  listProfileChangelogEvents
} from '../../../system/profile/profile-changelog-store.js';
import { getProfileNavigationState } from '../navigation/profile-navigation.js';

/* =============================================================================
   PROFILE FILTER OVERLAY
============================================================================= */

const DEFAULT_VALUE = 'all';
const MODEL_CHANGELOG_STORAGE_KEY = 'neuroartan.model.changelog.records';

const FILTER_CONTEXTS = Object.freeze({
  feed: {
    title: 'Feed Filters',
    copy: 'Refine the home feed by source, visibility, and order.',
    groups: [
      {
        key: 'source',
        label: 'Source',
        options: [
          { value: 'all', label: 'All' },
          { value: 'following', label: 'Following' },
          { value: 'profiles', label: 'Profiles' }
        ]
      },
      {
        key: 'sort',
        label: 'Sort',
        options: [
          { value: 'ranked', label: 'Ranked' },
          { value: 'latest', label: 'Latest' }
        ]
      }
    ]
  },
  notifications: {
    title: 'Notification Filters',
    copy: 'Refine notification history by read state and priority.',
    groups: [
      {
        key: 'state',
        label: 'State',
        options: [
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'read', label: 'Read' }
        ]
      },
      {
        key: 'priority',
        label: 'Priority',
        options: [
          { value: 'all', label: 'All' },
          { value: 'normal', label: 'Normal' },
          { value: 'low', label: 'Low' }
        ]
      }
    ]
  },
  posts: {
    title: 'Post Filters',
    copy: 'Refine your posts by route state, media, year, and order.',
    groups: [
      {
        key: 'visibility',
        label: 'Visibility',
        options: [
          { value: 'all', label: 'All' },
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private' }
        ]
      },
      {
        key: 'media',
        label: 'Media',
        options: [
          { value: 'all', label: 'All' },
          { value: 'text', label: 'Text' },
          { value: 'image', label: 'Image' },
          { value: 'video', label: 'Video' },
          { value: 'audio', label: 'Audio' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' }
        ]
      },
      {
        key: 'sort',
        label: 'Sort',
        options: [
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' }
        ]
      }
    ]
  },
  thoughts: {
    title: 'Thought Filters',
    copy: 'Refine private Thought Bank entries by category, year, and order.',
    groups: [
      {
        key: 'audience',
        label: 'Thought Bank',
        options: [
          { value: 'private', label: 'Private Thought Bank' }
        ]
      },
      {
        key: 'category',
        label: 'Category',
        options: [
          { value: 'all', label: 'All' },
          { value: 'identity', label: 'Identity' },
          { value: 'memory', label: 'Memory' },
          { value: 'strategy', label: 'Strategy' },
          { value: 'voice', label: 'Voice' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' }
        ]
      },
      {
        key: 'sort',
        label: 'Sort',
        options: [
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' }
        ]
      }
    ]
  },
  models: {
    title: 'Model Filters',
    copy: 'Refine owned and saved model records by trust, state, scope, expertise, and year.',
    groups: [
      {
        key: 'trust',
        label: 'Trust',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'verified', label: 'Verified' },
          { value: 'not-verified', label: 'Not Verified' }
        ]
      },
      {
        key: 'state',
        label: 'State',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'ready', label: 'Ready' },
          { value: 'training', label: 'Training' }
        ]
      },
      {
        key: 'scope',
        label: 'Scope',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'saved', label: 'Saved' },
          { value: 'hired', label: 'Hired' },
          { value: 'deployed', label: 'Deployed' }
        ]
      },
      {
        key: 'expertise',
        label: 'Expertise',
        options: [
          { value: 'all', label: 'Any' },
          { value: 'personal', label: 'Personal' },
          { value: 'expert', label: 'Expert' }
        ]
      },
      {
        key: 'year',
        label: 'Year',
        options: [
          { value: 'all', label: 'Any' },
          { value: '2026', label: '2026' }
        ]
      }
    ]
  },
  dashboard: {
    title: 'Dashboard Filters',
    copy: 'Scope dashboard signals by time range and metric family.',
    groups: [
      {
        key: 'range',
        label: 'Range',
        options: [
          { value: 'all', label: 'All time' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: 'year', label: 'This year' }
        ]
      },
      {
        key: 'metric',
        label: 'Metric',
        options: [
          { value: 'all', label: 'All' },
          { value: 'completion', label: 'Completion' },
          { value: 'activity', label: 'Activity' },
          { value: 'route', label: 'Route' }
        ]
      }
    ]
  },
  settingsChangelog: {
    title: 'Settings Changelog',
    copy: 'Review owner-side changes by settings area and time range.',
    groups: [
      {
        key: 'area',
        label: 'Area',
        options: [
          { value: 'all', label: 'All' },
          { value: 'general', label: 'General' },
          { value: 'identity', label: 'Identity' },
          { value: 'route', label: 'Route' },
          { value: 'privacy', label: 'Privacy' },
          { value: 'security', label: 'Security' },
          { value: 'verification', label: 'Verification' }
        ]
      },
      {
        key: 'range',
        label: 'Range',
        options: [
          { value: 'all', label: 'All time' },
          { value: 'today', label: 'Today' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' }
        ]
      }
    ]
  },
  modelChangelog: {
    title: 'Model Changelog',
    copy: 'Review changes recorded for the active model area.',
    groups: [
      {
        key: 'area',
        label: 'Area',
        options: [
          { value: 'model', label: 'All model' },
          { value: 'foundation', label: 'Foundation' },
          { value: 'training', label: 'Training' },
          { value: 'personalization', label: 'Personalization' },
          { value: 'settings', label: 'Settings' },
          { value: 'dashboard', label: 'Dashboard' }
        ]
      },
      {
        key: 'pane',
        label: 'Pane',
        options: [
          { value: 'all', label: 'All panes' }
        ]
      },
      {
        key: 'range',
        label: 'Range',
        options: [
          { value: 'all', label: 'All time' },
          { value: 'today', label: 'Today' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' }
        ]
      }
    ]
  },
  modelReset: {
    title: 'Model Reset',
    copy: 'Reset selected model values to company defaults with confirmation before any change is applied.',
    groups: [
      {
        key: 'area',
        label: 'Area',
        options: [
          { value: 'model', label: 'All model' },
          { value: 'foundation', label: 'Foundation' },
          { value: 'training', label: 'Training' },
          { value: 'personalization', label: 'Personalization' },
          { value: 'settings', label: 'Settings' },
          { value: 'dashboard', label: 'Dashboard' }
        ]
      },
      {
        key: 'pane',
        label: 'Pane',
        options: [
          { value: 'all', label: 'All panes' }
        ]
      },
      {
        key: 'section',
        label: 'Section',
        options: [
          { value: 'all', label: 'All sections' }
        ]
      },
      {
        key: 'field',
        label: 'Parameter',
        options: [
          { value: 'all', label: 'All parameters' }
        ]
      }
    ]
  },
  modelParameterFilter: {
    title: 'Parameter Filter',
    copy: 'Filter visible model parameters by area, pane, section, or exact parameter.',
    groups: [
      {
        key: 'area',
        label: 'Area',
        options: [
          { value: 'personalization', label: 'Personalization' }
        ]
      },
      {
        key: 'pane',
        label: 'Pane',
        options: [
          { value: 'all', label: 'All panes' }
        ]
      },
      {
        key: 'section',
        label: 'Section',
        options: [
          { value: 'all', label: 'All sections' }
        ]
      },
      {
        key: 'field',
        label: 'Parameter',
        options: [
          { value: 'all', label: 'All parameters' }
        ]
      }
    ]
  },
  modelLearn: {
    title: 'Learn',
    copy: 'Review the purpose of the active model area.',
    groups: []
  }
});

const MODEL_CHANGELOG_PANE_OPTIONS = Object.freeze({
  model: [
    { value: 'all', label: 'All panes' }
  ],
  foundation: [
    { value: 'all', label: 'All foundation' },
    { value: 'overview', label: 'Overview' },
    { value: 'identity', label: 'Identity' },
    { value: 'consent', label: 'Consent' },
    { value: 'sources', label: 'Source' },
    { value: 'personality', label: 'Personality' },
    { value: 'memory', label: 'Memory' },
    { value: 'voice', label: 'Voice' }
  ],
  training: [
    { value: 'all', label: 'All training' },
    { value: 'protocol', label: 'Protocol' },
    { value: 'source-selection', label: 'Source selection' },
    { value: 'execution', label: 'Execution' },
    { value: 'readiness', label: 'Readiness' }
  ],
  personalization: [
    { value: 'all', label: 'All personalization' },
    { value: 'cognition', label: 'Cognition' },
    { value: 'communication', label: 'Communication' },
    { value: 'memory', label: 'Memory' },
    { value: 'emotion', label: 'Emotion' },
    { value: 'behavior', label: 'Behavior' }
  ],
  settings: [
    { value: 'all', label: 'All settings' },
    { value: 'visibility', label: 'Visibility' },
    { value: 'directory', label: 'Directory' },
    { value: 'changelog', label: 'Changelog' }
  ],
  dashboard: [
    { value: 'all', label: 'All dashboard' },
    { value: 'overview', label: 'Overview' },
    { value: 'readiness', label: 'Readiness' },
    { value: 'signals', label: 'Signals' }
  ]
});

const MODEL_RESET_SECTION_OPTIONS = Object.freeze({
  all: [
    { value: 'all', label: 'All sections' }
  ],
  cognition: [
    { value: 'all', label: 'All cognition' },
    { value: 'reasoning', label: 'Reasoning' },
    { value: 'attention', label: 'Attention' },
    { value: 'flexibility', label: 'Flexibility' },
    { value: 'creativity', label: 'Creativity' },
    { value: 'reflection', label: 'Reflection' },
    { value: 'planning', label: 'Planning' }
  ],
  communication: [
    { value: 'all', label: 'All communication' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'language', label: 'Language' },
    { value: 'response-style', label: 'Response style' },
    { value: 'social-context', label: 'Social context' },
    { value: 'audience-response', label: 'Audience-specific response' }
  ],
  memory: [
    { value: 'all', label: 'All memory' },
    { value: 'retention', label: 'Retention' },
    { value: 'recall', label: 'Recall' },
    { value: 'autobiographical-continuity', label: 'Autobiographical continuity' },
    { value: 'memory-safety', label: 'Memory safety' }
  ],
  emotion: [
    { value: 'all', label: 'All emotion' },
    { value: 'tone', label: 'Tone' },
    { value: 'empathy', label: 'Empathy' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'mirroring', label: 'Mirroring' },
    { value: 'weighting', label: 'Weighting' }
  ],
  behavior: [
    { value: 'all', label: 'All behavior' },
    { value: 'action-posture', label: 'Action posture' },
    { value: 'restraint', label: 'Restraint' },
    { value: 'boundaries', label: 'Boundaries' },
    { value: 'reliability', label: 'Reliability' }
  ]
});

const MODEL_RESET_PARAMETER_OPTIONS = Object.freeze({
  all: [
    { value: 'all', label: 'All parameters' }
  ],
  reasoning: [
    { value: 'all', label: 'All reasoning' },
    { value: 'reasoningDepth', label: 'Reasoning depth' },
    { value: 'analyticalMode', label: 'Analytical mode' },
    { value: 'evidenceThreshold', label: 'Evidence threshold' },
    { value: 'abstractionLevel', label: 'Abstraction level' },
    { value: 'synthesisStrength', label: 'Synthesis strength' }
  ],
  attention: [
    { value: 'all', label: 'All attention' },
    { value: 'attentionFocus', label: 'Attention focus' },
    { value: 'detailSensitivity', label: 'Detail sensitivity' },
    { value: 'distractionResistance', label: 'Distraction resistance' },
    { value: 'priorityDetection', label: 'Priority detection' }
  ],
  flexibility: [
    { value: 'all', label: 'All flexibility' },
    { value: 'cognitiveFlexibility', label: 'Cognitive flexibility' },
    { value: 'perspectiveShifting', label: 'Perspective shifting' },
    { value: 'alternativeGeneration', label: 'Alternative generation' }
  ],
  creativity: [
    { value: 'all', label: 'All creativity' },
    { value: 'creativityLevel', label: 'Creativity' },
    { value: 'senseOfHumor', label: 'Humor' },
    { value: 'metaphorUse', label: 'Metaphor use' },
    { value: 'noveltyTolerance', label: 'Novelty tolerance' },
    { value: 'imaginationMode', label: 'Imagination mode' }
  ],
  reflection: [
    { value: 'all', label: 'All reflection' },
    { value: 'reflectionFrequency', label: 'Reflection frequency' },
    { value: 'reflectionDepth', label: 'Reflection depth' },
    { value: 'selfCorrectionStrength', label: 'Self-correction' },
    { value: 'uncertaintyAwareness', label: 'Uncertainty awareness' },
    { value: 'patternDetection', label: 'Pattern detection' },
    { value: 'contradictionDetection', label: 'Contradiction detection' }
  ],
  planning: [
    { value: 'all', label: 'All planning' },
    { value: 'processingMode', label: 'Processing mode' },
    { value: 'planningHorizon', label: 'Planning horizon' },
    { value: 'complexityTolerance', label: 'Complexity tolerance' }
  ],
  delivery: [
    { value: 'all', label: 'All delivery' },
    { value: 'directnessLevel', label: 'Directness' },
    { value: 'diplomacyLevel', label: 'Diplomacy' },
    { value: 'tactLevel', label: 'Tact' },
    { value: 'assertivenessLevel', label: 'Assertiveness' },
    { value: 'conflictStyle', label: 'Conflict style' }
  ],
  language: [
    { value: 'all', label: 'All language' },
    { value: 'languageStyle', label: 'Language style' },
    { value: 'vocabularyLevel', label: 'Vocabulary level' },
    { value: 'communicationRegister', label: 'Register' },
    { value: 'multilingualBehavior', label: 'Multilingual behavior' }
  ],
  'response-style': [
    { value: 'all', label: 'All response style' },
    { value: 'responseLength', label: 'Response length' },
    { value: 'explanationDepth', label: 'Explanation depth' },
    { value: 'structurePreference', label: 'Structure preference' },
    { value: 'clarificationThreshold', label: 'Clarification threshold' },
    { value: 'compressionLevel', label: 'Compression' }
  ],
  'social-context': [
    { value: 'all', label: 'All social context' },
    { value: 'audienceAdaptation', label: 'Audience adaptation' },
    { value: 'relationshipDistance', label: 'Relationship distance' },
    { value: 'boundaryAwareSpeech', label: 'Boundary-aware speech' },
    { value: 'publicFacingRestraint', label: 'Public-facing restraint' }
  ],
  'audience-response': [
    { value: 'all', label: 'All audience response' },
    { value: 'responseAudienceScope', label: 'Audience profile' },
    { value: 'publicResponseOpenness', label: 'Public openness' },
    { value: 'publicResponseDirectness', label: 'Public directness' },
    { value: 'publicResponseRestraint', label: 'Public restraint' },
    { value: 'friendsResponseWarmth', label: 'Friends warmth' },
    { value: 'friendsResponseDetail', label: 'Friends detail' },
    { value: 'friendsResponseHumor', label: 'Friends humor' },
    { value: 'followersResponseClarity', label: 'Followers clarity' },
    { value: 'followersResponseEfficiency', label: 'Followers efficiency' },
    { value: 'followersResponseOpenness', label: 'Followers openness' },
    { value: 'mutualResponseTrustDepth', label: 'Mutual trust depth' },
    { value: 'mutualResponseExplanationDepth', label: 'Mutual explanation depth' },
    { value: 'mutualResponseDirectness', label: 'Mutual directness' },
    { value: 'familyResponseWarmth', label: 'Family warmth' },
    { value: 'familyResponsePrivacyGuard', label: 'Family privacy guard' },
    { value: 'familyResponseHumor', label: 'Family humor' },
    { value: 'subscriberResponsePriority', label: 'Subscriber priority' },
    { value: 'subscriberResponseDetail', label: 'Subscriber detail' },
    { value: 'subscriberResponseProfessionalTone', label: 'Subscriber professional tone' }
  ],
  retention: [
    { value: 'all', label: 'All retention' },
    { value: 'memoryRetention', label: 'Retention period' },
    { value: 'forgettingMode', label: 'Forgetting mode' },
    { value: 'decaySensitivity', label: 'Decay sensitivity' }
  ],
  recall: [
    { value: 'all', label: 'All recall' },
    { value: 'continuityDepth', label: 'Continuity depth' },
    { value: 'recallPriority', label: 'Recall priority' },
    { value: 'contextWeighting', label: 'Context weighting' },
    { value: 'personalHistoryInfluence', label: 'Personal-history influence' },
    { value: 'sourceConfidenceThreshold', label: 'Source confidence threshold' }
  ],
  'autobiographical-continuity': [
    { value: 'all', label: 'All autobiographical continuity' },
    { value: 'narrativeContinuity', label: 'Narrative continuity' },
    { value: 'identityContinuity', label: 'Identity continuity' },
    { value: 'lifeEventSensitivity', label: 'Life-event sensitivity' }
  ],
  'memory-safety': [
    { value: 'all', label: 'All memory safety' },
    { value: 'sensitiveMemoryHandling', label: 'Sensitive memory handling' },
    { value: 'memoryCitationBehavior', label: 'Memory citation behavior' },
    { value: 'recallPermissionStrictness', label: 'Recall permission strictness' }
  ],
  tone: [
    { value: 'all', label: 'All tone' },
    { value: 'emotionalTone', label: 'Tone' },
    { value: 'warmthLevel', label: 'Warmth' },
    { value: 'emotionalIntensity', label: 'Emotional intensity' }
  ],
  empathy: [
    { value: 'all', label: 'All empathy' },
    { value: 'empathyLevel', label: 'Empathy' },
    { value: 'cognitiveEmpathy', label: 'Cognitive empathy' },
    { value: 'affectiveEmpathy', label: 'Affective empathy' },
    { value: 'validationStyle', label: 'Validation style' }
  ],
  regulation: [
    { value: 'all', label: 'All regulation' },
    { value: 'emotionalRegulation', label: 'Emotional regulation' },
    { value: 'calmnessLevel', label: 'Calmness' },
    { value: 'deescalationStrength', label: 'De-escalation' },
    { value: 'distressSensitivity', label: 'Distress sensitivity' }
  ],
  mirroring: [
    { value: 'all', label: 'All mirroring' },
    { value: 'emotionalMirroring', label: 'Emotional mirroring' },
    { value: 'moodAdaptation', label: 'Mood adaptation' },
    { value: 'sentimentSensitivity', label: 'Sentiment sensitivity' }
  ],
  weighting: [
    { value: 'all', label: 'All weighting' },
    { value: 'emotionalWeighting', label: 'Emotional weighting' }
  ],
  'action-posture': [
    { value: 'all', label: 'All action posture' },
    { value: 'riskTolerance', label: 'Risk tolerance' },
    { value: 'efficiencyPreference', label: 'Efficiency' },
    { value: 'initiativeLevel', label: 'Initiative' },
    { value: 'autonomyLevel', label: 'Autonomy' },
    { value: 'decisivenessLevel', label: 'Decisiveness' }
  ],
  boundaries: [
    { value: 'all', label: 'All boundaries' },
    { value: 'boundaryStrictness', label: 'Boundary strictness' },
    { value: 'consentSensitivity', label: 'Consent sensitivity' },
    { value: 'privacyStrictness', label: 'Privacy strictness' },
    { value: 'refusalStyle', label: 'Refusal style' },
    { value: 'vulnerabilityHandling', label: 'Vulnerability handling' }
  ],
  restraint: [
    { value: 'all', label: 'All restraint' },
    { value: 'restraintLevel', label: 'Restraint' },
    { value: 'cautionLevel', label: 'Caution' },
    { value: 'errorAvoidance', label: 'Error avoidance' },
    { value: 'escalationThreshold', label: 'Escalation threshold' }
  ],
  reliability: [
    { value: 'all', label: 'All reliability' },
    { value: 'consistencyLevel', label: 'Consistency' },
    { value: 'ruleAdherence', label: 'Rule adherence' },
    { value: 'taskPersistence', label: 'Task persistence' }
  ]
});

function getActiveModelResponseAudienceScope() {
  const select = document.querySelector('[data-model-personalization-field="responseAudienceScope"]');
  if (select instanceof HTMLSelectElement) {
    return String(select.value || 'public').trim() || 'public';
  }
  return 'public';
}

function getAudienceResponseParameterOptions(scope = getActiveModelResponseAudienceScope()) {
  const allOptions = MODEL_RESET_PARAMETER_OPTIONS['audience-response'] || MODEL_RESET_PARAMETER_OPTIONS.all;
  const normalizedScope = String(scope || 'public').trim();
  if (normalizedScope === 'all') return allOptions;

  const prefix = {
    public: 'publicResponse',
    friends: 'friendsResponse',
    followers: 'followersResponse',
    mutual: 'mutualResponse',
    mutuals: 'mutualResponse',
    family: 'familyResponse',
    subscribers: 'subscriberResponse'
  }[normalizedScope] || 'publicResponse';

  return allOptions.filter((option) => (
    option.value === 'all'
    || option.value === 'responseAudienceScope'
    || String(option.value || '').startsWith(prefix)
  ));
}

function getModelResetSectionOptions(area = 'model', pane = 'all') {
  if (area !== 'personalization') return MODEL_RESET_SECTION_OPTIONS.all;
  return MODEL_RESET_SECTION_OPTIONS[pane] || MODEL_RESET_SECTION_OPTIONS.all;
}

function getModelResetParameterOptions(section = 'all') {
  const normalizedSection = String(section || 'all').trim();
  if (normalizedSection === 'audience-response') {
    return getAudienceResponseParameterOptions();
  }
  return MODEL_RESET_PARAMETER_OPTIONS[normalizedSection] || MODEL_RESET_PARAMETER_OPTIONS.all;
}

const MODEL_CHANGELOG_FIELD_SCOPES = Object.freeze({
  reasoningDepth: 'cognition',
  analyticalMode: 'cognition',
  evidenceThreshold: 'cognition',
  abstractionLevel: 'cognition',
  synthesisStrength: 'cognition',
  attentionFocus: 'cognition',
  detailSensitivity: 'cognition',
  distractionResistance: 'cognition',
  priorityDetection: 'cognition',
  cognitiveFlexibility: 'cognition',
  perspectiveShifting: 'cognition',
  alternativeGeneration: 'cognition',
  creativityLevel: 'cognition',
  senseOfHumor: 'cognition',
  metaphorUse: 'cognition',
  noveltyTolerance: 'cognition',
  imaginationMode: 'cognition',
  reflectionFrequency: 'cognition',
  reflectionDepth: 'cognition',
  selfCorrectionStrength: 'cognition',
  uncertaintyAwareness: 'cognition',
  patternDetection: 'cognition',
  contradictionDetection: 'cognition',
  processingMode: 'cognition',
  planningHorizon: 'cognition',
  complexityTolerance: 'cognition',
  directnessLevel: 'communication',
  diplomacyLevel: 'communication',
  tactLevel: 'communication',
  assertivenessLevel: 'communication',
  conflictStyle: 'communication',
  languageStyle: 'communication',
  vocabularyLevel: 'communication',
  communicationRegister: 'communication',
  multilingualBehavior: 'communication',
  responseLength: 'communication',
  explanationDepth: 'communication',
  structurePreference: 'communication',
  clarificationThreshold: 'communication',
  compressionLevel: 'communication',
  audienceAdaptation: 'communication',
  relationshipDistance: 'communication',
  boundaryAwareSpeech: 'communication',
  publicFacingRestraint: 'communication',
  responseAudienceScope: 'communication',
  publicResponseOpenness: 'communication',
  publicResponseDirectness: 'communication',
  publicResponseRestraint: 'communication',
  friendsResponseWarmth: 'communication',
  friendsResponseDetail: 'communication',
  friendsResponseHumor: 'communication',
  followersResponseClarity: 'communication',
  followersResponseEfficiency: 'communication',
  followersResponseOpenness: 'communication',
  mutualResponseTrustDepth: 'communication',
  mutualResponseExplanationDepth: 'communication',
  mutualResponseDirectness: 'communication',
  familyResponseWarmth: 'communication',
  familyResponsePrivacyGuard: 'communication',
  familyResponseHumor: 'communication',
  subscriberResponsePriority: 'communication',
  subscriberResponseDetail: 'communication',
  subscriberResponseProfessionalTone: 'communication',
  memoryRetention: 'memory',
  forgettingMode: 'memory',
  decaySensitivity: 'memory',
  continuityDepth: 'memory',
  recallPriority: 'memory',
  contextWeighting: 'memory',
  personalHistoryInfluence: 'memory',
  sourceConfidenceThreshold: 'memory',
  narrativeContinuity: 'memory',
  identityContinuity: 'memory',
  lifeEventSensitivity: 'memory',
  sensitiveMemoryHandling: 'memory',
  memoryCitationBehavior: 'memory',
  recallPermissionStrictness: 'memory',
  emotionalTone: 'emotion',
  warmthLevel: 'emotion',
  emotionalIntensity: 'emotion',
  empathyLevel: 'emotion',
  cognitiveEmpathy: 'emotion',
  affectiveEmpathy: 'emotion',
  validationStyle: 'emotion',
  emotionalRegulation: 'emotion',
  calmnessLevel: 'emotion',
  deescalationStrength: 'emotion',
  distressSensitivity: 'emotion',
  emotionalMirroring: 'emotion',
  moodAdaptation: 'emotion',
  sentimentSensitivity: 'emotion',
  emotionalWeighting: 'emotion',
  riskTolerance: 'behavior',
  efficiencyPreference: 'behavior',
  initiativeLevel: 'behavior',
  autonomyLevel: 'behavior',
  decisivenessLevel: 'behavior',
  restraintLevel: 'behavior',
  cautionLevel: 'behavior',
  errorAvoidance: 'behavior',
  escalationThreshold: 'behavior',
  boundaryStrictness: 'behavior',
  consentSensitivity: 'behavior',
  privacyStrictness: 'behavior',
  refusalStyle: 'behavior',
  vulnerabilityHandling: 'behavior',
  consistencyLevel: 'behavior',
  ruleAdherence: 'behavior',
  taskPersistence: 'behavior'
});

const MODEL_LEARN_CONTENT = Object.freeze({
  default: {
    title: 'Model workspace',
    copy: 'This area controls the personal model owned by the profile. It is separate from ICOS machine preferences and interface settings.'
  },
  cognition: {
    title: 'Cognition',
    copy: 'Cognition controls how the model reasons, attends, abstracts, reflects, detects patterns, handles uncertainty, and shifts perspective before it responds.'
  },
  communication: {
    title: 'Communication',
    copy: 'Communication controls how the model speaks across delivery, language, response structure, social context, and audience-specific relationships.'
  },
  behavior: {
    title: 'Behavior',
    copy: 'Behavior controls action posture, restraint, boundaries, and reliability so the model acts consistently within owner-defined limits.'
  },
  language: {
    title: 'Language',
    copy: 'Language controls how the model speaks. It does not change the interface language or ICOS assistant preferences.'
  },
  emotion: {
    title: 'Emotion',
    copy: 'Emotion controls tone, empathy, regulation, mirroring, and affect weighting without turning the model into therapy.'
  },
  response: {
    title: 'Response',
    copy: 'Response controls how the owner model answers different relationship groups. General applies by default; public, friends, followers, mutuals, family, and subscribers can be tuned separately.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:general': {
    title: 'General response',
    copy: 'General response settings apply as the default behavior for every interaction unless a relationship-specific rule overrides them.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:public': {
    title: 'Public response',
    copy: 'Public response settings control how the model answers people with no private relationship to the owner. This layer should keep openness, directness, and humor within public-safe boundaries.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:friends': {
    title: 'Friends response',
    copy: 'Friends response settings tune warmth, detail, and humor for people the owner has accepted into a closer social circle.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:followers': {
    title: 'Followers response',
    copy: 'Followers response settings tune clarity, efficiency, and openness for people who follow the owner without requiring mutual access.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:mutuals': {
    title: 'Mutual response',
    copy: 'Mutual response settings tune trust depth, explanation depth, and directness for accounts where the relationship is reciprocal.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:family': {
    title: 'Family response',
    copy: 'Family response settings tune warmth, privacy guard, and humor for close personal relationships while preserving owner safety and consent boundaries.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  'response:subscribers': {
    title: 'Subscriber response',
    copy: 'Subscriber response settings tune priority, detail, and professional tone for paid or privileged audience contexts.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  },
  memory: {
    title: 'Memory',
    copy: 'Memory controls retention, recall, autobiographical continuity, and memory safety for owner-controlled model behavior.'
  },
  creativity: {
    title: 'Creativity',
    copy: 'Creativity controls humor, exploration, and expressive tolerance for model responses.'
  },
  reflection: {
    title: 'Reflection',
    copy: 'Reflection controls how often the model reviews behavior and adapts from owner-approved context.'
  },
  consent: {
    title: 'Consent',
    copy: 'Consent controls which owner-approved sources can be used for model context, training, and runtime behavior.'
  },
  sources: {
    title: 'Source Calibration',
    copy: 'Source Calibration privately helps your model begin from a baseline of agency, reflection, regulation, and continuity. It is not a diagnosis, therapy, spiritual framework, public score, or identity label. Your answers and Source Profile remain private model foundation data and are not shown to other users.',
    details: [
      'Move the slider toward the red indicator when a statement feels less accurate for your current experience.',
      'Move the slider toward the green indicator when a statement feels more accurate for your current experience.',
      'Release the slider to record the answer and move automatically to the next question. You can use Previous to adjust the last answer.',
      'The result helps the model choose safer starting defaults for reflection, pacing, memory linking, and support style.'
    ],
    scaleGuide: true,
    docsHref: 'https://docs.neuroartan.com/model-identity/source-calibration/'
  },
  personality: {
    title: 'Personality Calibration',
    copy: 'Personality Calibration helps your model begin from a private baseline of cognitive style, self-model function, regulation, and reflection tolerance. It also explains stable cognitive style, motivational pattern, interpersonal expression, and model reflection behavior. It is not a diagnosis, horoscope, fixed type, public score, or identity label. Your answers and Personality Profile remain private model foundation data and are not shown to other users.',
    details: [
      'Move the slider toward the red indicator when a statement feels less accurate for your current personality pattern.',
      'Move the slider toward the green indicator when a statement feels more accurate for your current personality pattern.',
      'Release the slider to record the answer and move automatically to the next question. You can use Previous to adjust the last answer.',
      'The result helps the model choose safer starting defaults for reflection pacing, challenge level, support style, interpersonal framing, and continuity.'
    ],
    scaleGuide: true,
    docsHref: 'https://docs.neuroartan.com/model-identity/personality-calibration/'
  },
  voice: {
    title: 'Voice',
    copy: 'Voice controls consent-bound voice training and future owner-representative interaction.'
  },
  protocol: {
    title: 'Protocol',
    copy: 'Protocol defines the training recipe, source selection, execution settings, readiness checks, and governed activation path.'
  },
  directory: {
    title: 'Directory',
    copy: 'Directory shows public model registry projections and discovery filters. Private owner-only model controls stay hidden when the viewer is not authenticated.'
  },
  visibility: {
    title: 'Model visibility',
    copy: 'Visibility controls who can discover and navigate the owner model. Public discovery is available to signed-out viewers when enabled; relationship-specific visibility prepares the friend, follower, mutual, family, and subscriber permission layer.',
    docsHref: 'https://docs.neuroartan.com/products/model-training/'
  }
});

const STORE = (window.__NEUROARTAN_PROFILE_FILTERS__ ||= {
  context: 'posts',
  filters: {},
  subscribers: new Set(),
  modelChangelogHydrationPending: false,
  modelChangelogHydrated: false
});

function normalizeContext(value) {
  const context = String(value || '').trim();
  return FILTER_CONTEXTS[context] ? context : 'posts';
}

function getDefaultFilters(context) {
  const definition = FILTER_CONTEXTS[normalizeContext(context)];
  return Object.fromEntries(definition.groups.map((group) => [
    group.key,
    normalizeContext(context) === 'thoughts' && group.key === 'audience'
      ? 'private'
      : group.options[0]?.value || DEFAULT_VALUE
  ]));
}

function getModelChangelogPaneOptions(area = 'model') {
  return MODEL_CHANGELOG_PANE_OPTIONS[String(area || 'model').trim()] || MODEL_CHANGELOG_PANE_OPTIONS.model;
}

function getModelParameterFilterPaneOptions(filters = {}) {
  const area = String(filters.area || 'personalization').trim() || 'personalization';
  const pane = String(filters.pane || '').trim();
  const paneOptions = getModelChangelogPaneOptions(area);
  const activePane = paneOptions.find((option) => option.value === pane);

  if (activePane && activePane.value !== 'all') {
    return [activePane];
  }

  return paneOptions;
}

function normalizeFilters(context, filters = {}) {
  const definition = FILTER_CONTEXTS[normalizeContext(context)];
  const defaults = getDefaultFilters(context);
  const normalizedContext = normalizeContext(context);

  definition.groups.forEach((group) => {
    const value = String(filters?.[group.key] || '').trim();
    const allowed = new Set(group.options.map((option) => option.value));
    defaults[group.key] = normalizedContext === 'thoughts' && group.key === 'audience'
      ? 'private'
      : allowed.has(value) ? value : defaults[group.key];
  });

  if (normalizedContext === 'modelChangelog') {
    defaults.area = String(filters?.area || '').trim() || 'model';
    const paneOptions = getModelChangelogPaneOptions(defaults.area);
    const allowedPanes = new Set(paneOptions.map((option) => option.value));
    const pane = String(filters?.pane || '').trim();
    defaults.pane = allowedPanes.has(pane) ? pane : paneOptions[0]?.value || 'all';
  }

  if (normalizedContext === 'modelReset') {
    defaults.area = String(filters?.area || '').trim() || 'model';
    const paneOptions = getModelChangelogPaneOptions(defaults.area);
    const allowedPanes = new Set(paneOptions.map((option) => option.value));
    const pane = String(filters?.pane || '').trim();
    defaults.pane = allowedPanes.has(pane) ? pane : paneOptions[0]?.value || 'all';

    const sectionOptions = getModelResetSectionOptions(defaults.area, defaults.pane);
    const allowedSections = new Set(sectionOptions.map((option) => option.value));
    const section = String(filters?.section || '').trim();
    defaults.section = allowedSections.has(section) ? section : sectionOptions[0]?.value || 'all';

    const parameterOptions = getModelResetParameterOptions(defaults.section);
    const allowedParameters = new Set(parameterOptions.map((option) => option.value));
    const field = String(filters?.field || '').trim();
    defaults.field = allowedParameters.has(field) ? field : parameterOptions[0]?.value || 'all';
  }

  if (normalizedContext === 'modelParameterFilter') {
    defaults.area = String(filters?.area || '').trim() || 'personalization';
    const paneOptions = getModelChangelogPaneOptions(defaults.area);
    const allowedPanes = new Set(paneOptions.map((option) => option.value));
    const pane = String(filters?.pane || '').trim();
    defaults.pane = allowedPanes.has(pane) ? pane : paneOptions[0]?.value || 'all';

    const sectionOptions = getModelResetSectionOptions(defaults.area, defaults.pane);
    const allowedSections = new Set(sectionOptions.map((option) => option.value));
    const section = String(filters?.section || '').trim();
    defaults.section = allowedSections.has(section) ? section : sectionOptions[0]?.value || 'all';

    const parameterOptions = getModelResetParameterOptions(defaults.section);
    const allowedParameters = new Set(parameterOptions.map((option) => option.value));
    const field = String(filters?.field || '').trim();
    defaults.field = allowedParameters.has(field) ? field : parameterOptions[0]?.value || 'all';
  }

  if (normalizedContext === 'modelLearn') {
    defaults.section = String(filters?.section || '').trim();
    defaults.modelPane = String(filters?.modelPane || '').trim();
    defaults.responseAudience = String(filters?.responseAudience || '').trim();
  }

  return defaults;
}

function resolveModelLearnContent(filters = {}) {
  const navigationState = getProfileNavigationState();
  const hashState = getModelLearnHashState();
  const pane = String(filters.modelPane || navigationState.modelPane || hashState.modelPane || '').trim();
  const responseAudience = String(filters.responseAudience || '').trim();
  const section = String(filters.section || navigationState.section || hashState.section || '').replace(/^model-/, '').trim();

  if ((pane === 'response' || pane === 'communication') && responseAudience) {
    return MODEL_LEARN_CONTENT[`response:${responseAudience}`] || MODEL_LEARN_CONTENT.communication || MODEL_LEARN_CONTENT.response;
  }

  return MODEL_LEARN_CONTENT[pane] || MODEL_LEARN_CONTENT[section] || MODEL_LEARN_CONTENT.default;
}

function getModelLearnHashState() {
  const hash = String(window.location.hash || '').replace(/^#/, '').trim();
  const parts = hash.split('/').filter(Boolean);

  if (parts[0] !== 'model') {
    return {
      section: '',
      modelPane: '',
    };
  }

  return {
    section: parts[1] ? `model-${parts[1]}` : '',
    modelPane: parts[2] || '',
  };
}

function renderModelLearn(root, filters = {}) {
  if (!(root instanceof HTMLElement)) return;
  const content = resolveModelLearnContent(filters);
  const section = document.createElement('section');
  section.className = 'profile-filter-overlay__learn';

  const title = document.createElement('h3');
  title.className = 'profile-filter-overlay__learn-title';
  title.textContent = content.title;

  const copy = document.createElement('p');
  copy.className = 'profile-filter-overlay__learn-copy';
  copy.textContent = content.copy;

  section.append(title, copy);

  if (content.scaleGuide === true) {
    const guide = document.createElement('div');
    guide.className = 'profile-filter-overlay__learn-scale-guide';
    guide.innerHTML = `
      <span class="profile-filter-overlay__learn-scale-item">
        <span class="profile-filter-overlay__learn-scale-dot profile-filter-overlay__learn-scale-dot--disagree" aria-hidden="true"></span>
        <span>Less accurate</span>
      </span>
      <span class="profile-filter-overlay__learn-scale-item">
        <span class="profile-filter-overlay__learn-scale-dot profile-filter-overlay__learn-scale-dot--agree" aria-hidden="true"></span>
        <span>More accurate</span>
      </span>
    `;
    section.append(guide);
  }

  if (Array.isArray(content.details) && content.details.length) {
    const list = document.createElement('ul');
    list.className = 'profile-filter-overlay__learn-list';
    content.details.forEach((detail) => {
      const item = document.createElement('li');
      item.textContent = detail;
      list.append(item);
    });
    section.append(list);
  }

  if (content.docsHref) {
    const link = document.createElement('a');
    link.className = 'profile-filter-overlay__learn-link';
    link.href = content.docsHref;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Learn more';
    section.append(link);
  }

  root.append(section);
}

function notifySubscribers(context = STORE.context) {
  const state = getProfileFilterState(context);
  STORE.subscribers.forEach((subscriber) => {
    try {
      subscriber(state);
    } catch (error) {
      console.error('[profile-filter-overlay] Subscriber update failed.', error);
    }
  });

  document.dispatchEvent(new CustomEvent('profile:filter-change', {
    detail: state
  }));
}

export function getProfileFilterState(context = STORE.context) {
  const normalizedContext = normalizeContext(context);
  return {
    context: normalizedContext,
    filters: normalizeFilters(normalizedContext, STORE.filters[normalizedContext])
  };
}

export function subscribeProfileFilters(subscriber) {
  if (typeof subscriber !== 'function') return () => {};
  STORE.subscribers.add(subscriber);
  subscriber(getProfileFilterState());
  return () => {
    STORE.subscribers.delete(subscriber);
  };
}

function getOverlayRoot() {
  return document.querySelector('[data-profile-filter-overlay]');
}

function setOverlayOpen(open) {
  const root = getOverlayRoot();
  if (!(root instanceof HTMLElement)) return;
  root.hidden = !open;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function renderOverlay(context = STORE.context) {
  const root = getOverlayRoot();
  if (!(root instanceof HTMLElement)) return;

  const normalizedContext = normalizeContext(context);
  const definition = FILTER_CONTEXTS[normalizedContext];
  const state = getProfileFilterState(normalizedContext);
  const groupsRoot = root.querySelector('[data-profile-filter-groups]');
  const title = root.querySelector('[data-profile-filter-title]');
  const reset = root.querySelector('[data-profile-filter-reset]');

  root.dataset.profileFilterContext = normalizedContext;
  if (title instanceof HTMLElement) title.textContent = definition.title;
  if (reset instanceof HTMLElement) reset.hidden = normalizedContext === 'modelLearn';
  if (!(groupsRoot instanceof HTMLElement)) return;

  clearNode(groupsRoot);

  if (normalizedContext === 'modelLearn') {
    renderModelLearn(groupsRoot, state.filters);
    return;
  }

  definition.groups.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'profile-filter-overlay__group';
    section.dataset.profileFilterGroup = group.key;

    const dynamicModelSelection = normalizedContext === 'modelReset' || normalizedContext === 'modelParameterFilter';
    const groupOptions = normalizedContext === 'modelChangelog' && group.key === 'pane'
      ? getModelChangelogPaneOptions(state.filters.area)
      : normalizedContext === 'modelParameterFilter' && group.key === 'pane'
        ? getModelParameterFilterPaneOptions(state.filters)
        : normalizedContext === 'modelReset' && group.key === 'pane'
          ? getModelChangelogPaneOptions(state.filters.area)
          : dynamicModelSelection && group.key === 'section'
            ? getModelResetSectionOptions(state.filters.area, state.filters.pane)
            : dynamicModelSelection && group.key === 'field'
              ? getModelResetParameterOptions(state.filters.section)
              : group.options;

    const label = document.createElement('p');
    label.className = 'profile-filter-overlay__label';
    label.textContent = group.label;

    const options = document.createElement('div');
    options.className = 'profile-filter-overlay__options';

    if (group.key === 'year') {
      const select = document.createElement('select');
      select.className = 'profile-filter-overlay__select';
      select.dataset.profileFilterOption = group.key;
      select.setAttribute('aria-label', group.label);

      groupOptions.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (state.filters[group.key] === option.value) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });

      select.addEventListener('change', () => {
        updateFilter(normalizedContext, group.key, select.value);
      });

      options.appendChild(select);
    } else {
      groupOptions.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'profile-filter-overlay__chip';
        button.type = 'button';
        button.dataset.profileFilterOption = group.key;
        button.dataset.profileFilterValue = option.value;
        button.setAttribute('aria-pressed', state.filters[group.key] === option.value ? 'true' : 'false');
        button.textContent = option.label;
        options.appendChild(button);
      });
    }

    section.appendChild(label);
    section.appendChild(options);
    groupsRoot.appendChild(section);
  });

  if (normalizedContext === 'settingsChangelog' || normalizedContext === 'modelChangelog') {
    const ledger = document.createElement('section');
    ledger.className = 'profile-filter-overlay__ledger';
    ledger.setAttribute('aria-live', 'polite');
    ledger.innerHTML = '<div class="ui-loading-inline"><span class="ui-loading-inline__spinner" aria-hidden="true"></span></div>';
    groupsRoot.appendChild(ledger);
    void renderChangelogLedger(ledger, state.filters);
  }

  if (normalizedContext === 'modelReset') {
    renderModelResetConfirmation(groupsRoot, state.filters);
  }
}

function renderModelResetConfirmation(root, filters = {}) {
  if (!(root instanceof HTMLElement)) return;

  const section = document.createElement('section');
  section.className = 'profile-filter-overlay__ledger';
  section.setAttribute('aria-live', 'polite');

  const area = String(filters.area || 'model');
  const pane = String(filters.pane || 'all');
  const resetSection = String(filters.section || 'all');
  const field = String(filters.field || 'all');

  section.innerHTML = `
    <article class="profile-filter-overlay__event">
      <strong>Reset</strong>
      <span>${escapeHtml(area)} · ${escapeHtml(pane)} · ${escapeHtml(resetSection)}</span>
      <div class="profile-filter-overlay__options">
        <button class="profile-filter-overlay__chip" type="button" data-model-reset-review="true">Review reset</button>
      </div>
    </article>
  `;

  root.append(section);
}

function removeModelResetReviewOverlay() {
  document.querySelectorAll('[data-model-reset-review-overlay]').forEach((node) => {
    if (node instanceof HTMLElement) node.remove();
  });
}

function renderModelResetReviewOverlay(filters = {}) {
  removeModelResetReviewOverlay();

  const field = String(filters.field || 'all');
  const overlay = document.createElement('section');
  overlay.className = 'ui-confirm-layer profile-filter-overlay__confirm-layer';
  overlay.dataset.modelResetReviewOverlay = 'true';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <article class="ui-confirm-card profile-filter-overlay__confirm-card">
      <strong>Confirm reset</strong>
      <p>Reset ${escapeHtml(field === 'all' ? 'selected parameters' : 'this parameter')} to defaults?</p>
      <div class="profile-filter-overlay__options">
        <button class="profile-filter-overlay__chip" type="button" data-model-reset-confirm="true">Yes</button>
        <button class="profile-filter-overlay__chip" type="button" data-model-reset-cancel="true">No</button>
      </div>
    </article>
  `;

  document.body.append(overlay);
  overlay.querySelector('[data-model-reset-confirm]')?.focus?.();
}

function formatEventDate(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}


function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function isEventWithinRange(value = '', range = 'all') {
  if (!range || range === 'all') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);

  if (range === 'today') {
    return date.toDateString() === now.toDateString();
  }

  if (range === '7d') {
    start.setDate(now.getDate() - 7);
    return date >= start;
  }

  if (range === '30d') {
    start.setDate(now.getDate() - 30);
    return date >= start;
  }

  return true;
}

function renderChangelogEvents(root, events = [], emptyCopy = 'No changes recorded yet') {
  if (!(root instanceof HTMLElement)) return;

  if (!events.length) {
    root.innerHTML = `<p class="profile-filter-overlay__empty">${escapeHtml(emptyCopy)}</p>`;
    return;
  }

  root.innerHTML = events.map((event) => `
    <article class="profile-filter-overlay__event">
      <strong>${escapeHtml(event.title || 'Change recorded')}</strong>
      <span>${escapeHtml(formatEventDate(event.createdAt))}</span>
      ${event.detail ? `<p>${escapeHtml(event.detail)}</p>` : ''}
    </article>
  `).join('');
}

function requestModelChangelogHydration() {
  if (STORE.modelChangelogHydrated === true) return;
  if (STORE.modelChangelogHydrationPending === true) return;
  STORE.modelChangelogHydrationPending = true;

  document.dispatchEvent(new CustomEvent('model:changelog-hydration-request', {
    detail: {
      source: 'profile-filter-overlay'
    }
  }));
}

function loadModelChangelogEvents(filters = {}) {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(MODEL_CHANGELOG_STORAGE_KEY) || '[]');
    const records = Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
    const area = String(filters.area || 'model').trim().toLowerCase();
    const pane = String(filters.pane || 'all').trim().toLowerCase();
    const range = String(filters.range || 'all').trim();

    return records.filter((entry) => {
      if (!isEventWithinRange(entry.createdAt, range)) return false;
      const entryPane = String(entry.pane || MODEL_CHANGELOG_FIELD_SCOPES[entry.field] || '').toLowerCase();
      const entryArea = String(entry.area || (entry.scope === 'Personalization' ? 'personalization' : entry.scope) || '').toLowerCase();
      const areaMatches = !area || area === 'model' || area === 'all' || entryArea === area;
      const paneMatches = !pane || pane === 'all' || entryPane === pane;
      return areaMatches && paneMatches;
    });
  } catch (error) {
    return [];
  }
}

function renderModelChangelogLedger(root, filters = {}) {
  requestModelChangelogHydration();
  const events = loadModelChangelogEvents(filters).map((event) => ({
    title: event.action === 'reset'
      ? `${event.label || 'Model change recorded'} · Reset to default`
      : event.label || 'Model change recorded',
    detail: `${event.from || 'Unset'} → ${event.to || 'Unset'}`,
    createdAt: event.createdAt
  }));

  renderChangelogEvents(root, events, 'No model changes recorded yet');
}


async function renderChangelogLedger(root, filters = {}) {
  if (STORE.context === 'modelChangelog') {
    renderModelChangelogLedger(root, filters);
    return;
  }

  const events = (await listProfileChangelogEvents(filters)).map((event) => {
    const metadata = event.event_metadata || event.metadata || {};
    const fromValue = String(metadata.from_value || metadata.fromValue || '').trim();
    const toValue = String(metadata.to_value || metadata.toValue || '').trim();
    const detail = event.event_detail || '';
    const action = event.event_action || '';
    const area = event.event_area || event.area || '';

    let constructedDetail = detail;
    if (fromValue && toValue) {
      constructedDetail = `${detail} ${fromValue} → ${toValue}`.trim();
    } else if (fromValue || toValue) {
      constructedDetail = `${detail} ${fromValue || toValue}`.trim();
    }

    if (!constructedDetail && action) {
      constructedDetail = action;
    }

    if (area && constructedDetail) {
      constructedDetail = `${area} · ${constructedDetail}`;
    }

    return {
      title: event.event_title || 'Change recorded',
      detail: constructedDetail,
      createdAt: event.event_created_at || event.created_at
    };
  });

  renderChangelogEvents(root, events, 'No changes recorded yet');
}

function updateFilter(context, key, value) {
  const normalizedContext = normalizeContext(context);
  const filters = normalizeFilters(normalizedContext, STORE.filters[normalizedContext]);
  filters[key] = value;
  if (normalizedContext === 'modelChangelog' && key === 'area') {
    filters.pane = getModelChangelogPaneOptions(value)[0]?.value || 'all';
  }
  if (normalizedContext === 'modelReset' && key === 'area') {
    filters.pane = getModelChangelogPaneOptions(value)[0]?.value || 'all';
    filters.section = getModelResetSectionOptions(value, filters.pane)[0]?.value || 'all';
    filters.field = getModelResetParameterOptions(filters.section)[0]?.value || 'all';
  }
  if (normalizedContext === 'modelReset' && key === 'pane') {
    filters.section = getModelResetSectionOptions(filters.area, value)[0]?.value || 'all';
    filters.field = getModelResetParameterOptions(filters.section)[0]?.value || 'all';
  }
  if (normalizedContext === 'modelReset' && key === 'section') {
    filters.field = getModelResetParameterOptions(value)[0]?.value || 'all';
  }
  if (normalizedContext === 'modelParameterFilter' && key === 'area') {
    filters.pane = getModelChangelogPaneOptions(value)[0]?.value || 'all';
    filters.section = getModelResetSectionOptions(value, filters.pane)[0]?.value || 'all';
    filters.field = getModelResetParameterOptions(filters.section)[0]?.value || 'all';
  }
  if (normalizedContext === 'modelParameterFilter' && key === 'pane') {
    filters.section = getModelResetSectionOptions(filters.area, value)[0]?.value || 'all';
    filters.field = getModelResetParameterOptions(filters.section)[0]?.value || 'all';
  }
  if (normalizedContext === 'modelParameterFilter' && key === 'section') {
    filters.field = getModelResetParameterOptions(value)[0]?.value || 'all';
  }
  STORE.filters[normalizedContext] = normalizeFilters(normalizedContext, filters);
  renderOverlay(normalizedContext);
  notifySubscribers(normalizedContext);
  if (normalizedContext === 'modelParameterFilter') {
    document.dispatchEvent(new CustomEvent('model:parameter-filter-change', {
      detail: {
        source: 'profile-filter-overlay',
        filters: getProfileFilterState('modelParameterFilter').filters
      }
    }));
  }
}

function resetFilters(context) {
  const normalizedContext = normalizeContext(context);
  STORE.filters[normalizedContext] = getDefaultFilters(normalizedContext);
  renderOverlay(normalizedContext);
  notifySubscribers(normalizedContext);
  if (normalizedContext === 'modelParameterFilter') {
    document.dispatchEvent(new CustomEvent('model:parameter-filter-change', {
      detail: {
        source: 'profile-filter-overlay',
        filters: getProfileFilterState('modelParameterFilter').filters
      }
    }));
  }
}

function openFilterOverlay(context, filters = {}) {
  STORE.context = normalizeContext(context);
  if (STORE.context !== 'modelChangelog') {
    STORE.modelChangelogHydrationPending = false;
  }
  STORE.filters[STORE.context] = normalizeFilters(STORE.context, {
    ...STORE.filters[STORE.context],
    ...filters
  });
  renderOverlay(STORE.context);
  setOverlayOpen(true);
}

function bindFilterOverlay() {
  if (document.documentElement.dataset.profileFilterOverlayBound === 'true') return;
  document.documentElement.dataset.profileFilterOverlayBound = 'true';

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const close = target?.closest('[data-profile-filter-close]');
    const reset = target?.closest('[data-profile-filter-reset]');
    const option = target?.closest('[data-profile-filter-option]');
    const modelResetReview = target?.closest('[data-model-reset-review]');
    const modelResetConfirm = target?.closest('[data-model-reset-confirm]');
    const modelResetCancel = target?.closest('[data-model-reset-cancel]');

    if (close) {
      event.preventDefault();
      removeModelResetReviewOverlay();
      setOverlayOpen(false);
      return;
    }

    if (reset) {
      event.preventDefault();
      resetFilters(STORE.context);
      return;
    }

    if (modelResetReview) {
      event.preventDefault();
      renderModelResetReviewOverlay(getProfileFilterState('modelReset').filters);
      return;
    }

    if (modelResetConfirm) {
      event.preventDefault();
      removeModelResetReviewOverlay();
      document.dispatchEvent(new CustomEvent('model:reset-request', {
        detail: {
          source: 'profile-filter-overlay',
          filters: getProfileFilterState('modelReset').filters
        }
      }));
      setOverlayOpen(false);
      return;
    }

    if (modelResetCancel) {
      event.preventDefault();
      removeModelResetReviewOverlay();
      setOverlayOpen(false);
      return;
    }

    if (option instanceof HTMLButtonElement) {
      event.preventDefault();
      updateFilter(
        STORE.context,
        option.getAttribute('data-profile-filter-option') || '',
        option.getAttribute('data-profile-filter-value') || DEFAULT_VALUE
      );
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    removeModelResetReviewOverlay();
    setOverlayOpen(false);
  });

  document.addEventListener('model:changelog-hydrated', () => {
    STORE.modelChangelogHydrationPending = false;
    STORE.modelChangelogHydrated = true;
    if (STORE.context !== 'modelChangelog') return;
    renderOverlay('modelChangelog');
  });

  document.addEventListener('model:changelog-refresh-request', () => {
    STORE.modelChangelogHydrationPending = false;
    STORE.modelChangelogHydrated = false;
    window.localStorage?.removeItem(MODEL_CHANGELOG_STORAGE_KEY);
    requestModelChangelogHydration();
    if (STORE.context !== 'modelChangelog') return;
    renderOverlay('modelChangelog');
  });
  document.addEventListener('profile:filter-open-request', (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    openFilterOverlay(detail.context || 'posts', detail.filters || {});
  });
}

function initProfileFilterOverlay() {
  bindFilterOverlay();
  renderOverlay(STORE.context);
}

document.addEventListener('fragment:mounted', (event) => {
  if (event?.detail?.name !== 'profile-private-filter-overlay') return;
  initProfileFilterOverlay();
});

initProfileFilterOverlay();
