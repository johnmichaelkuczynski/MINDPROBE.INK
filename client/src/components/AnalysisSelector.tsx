import { Card, CardContent } from "@/components/ui/card";
import { AnalysisType } from "@/types/analysis";
import { Brain, Lightbulb, User, Users, Stethoscope, ClipboardList, Zap } from "lucide-react";

interface AnalysisSelectorProps {
  selectedType: AnalysisType;
  onTypeSelect: (type: AnalysisType) => void;
}

const analysisGroups = [
  {
    domain: "Cognitive",
    types: [
      {
        id: 'micro-cognitive' as AnalysisType,
        title: 'Micro Cognitive',
        description: 'All 18 questions, razor-sharp answers',
        icon: Zap,
        badge: 'micro',
      },
      {
        id: 'cognitive' as AnalysisType,
        title: 'Cognitive',
        description: 'Basic cognitive assessment with core intelligence metrics',
        icon: Lightbulb,
        badge: null,
      },
      {
        id: 'comprehensive-cognitive' as AnalysisType,
        title: 'Comprehensive Cognitive',
        description: 'Full cognitive analysis with exhaustive depth',
        icon: Brain,
        badge: 'full',
      },
    ],
  },
  {
    domain: "Psychological",
    types: [
      {
        id: 'micro-psychological' as AnalysisType,
        title: 'Micro Psychological',
        description: 'All 18 questions, razor-sharp answers',
        icon: Zap,
        badge: 'micro',
      },
      {
        id: 'psychological' as AnalysisType,
        title: 'Psychological',
        description: 'Personality and behavioral assessment',
        icon: User,
        badge: null,
      },
      {
        id: 'comprehensive-psychological' as AnalysisType,
        title: 'Comprehensive Psychological',
        description: 'Full psychological profile with exhaustive depth',
        icon: Users,
        badge: 'full',
      },
    ],
  },
  {
    domain: "Psychopathological",
    types: [
      {
        id: 'micro-psychopathological' as AnalysisType,
        title: 'Micro Psychopathological',
        description: 'All 18 questions, razor-sharp answers',
        icon: Zap,
        badge: 'micro',
      },
      {
        id: 'psychopathological' as AnalysisType,
        title: 'Psychopathological',
        description: 'Clinical pathology assessment',
        icon: Stethoscope,
        badge: null,
      },
      {
        id: 'comprehensive-psychopathological' as AnalysisType,
        title: 'Comprehensive Psychopathological',
        description: 'Full clinical assessment with exhaustive depth',
        icon: ClipboardList,
        badge: 'full',
      },
    ],
  },
];

const badgeStyles: Record<string, string> = {
  micro: 'bg-amber-100 text-amber-700',
  full: 'bg-purple-100 text-purple-700',
};

export function AnalysisSelector({ selectedType, onTypeSelect }: AnalysisSelectorProps) {
  return (
    <Card className="border-border-light shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Select Analysis Type</h2>
        <div className="space-y-4">
          {analysisGroups.map((group) => (
            <div key={group.domain}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 pl-1">
                {group.domain}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {group.types.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => onTypeSelect(type.id)}
                      data-testid={`analysis-${type.id}`}
                      className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-primary-blue bg-blue-50'
                          : 'border-border-light hover:border-primary-blue hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-primary-blue" />
                          <h3 className="font-semibold text-sm">{type.title}</h3>
                        </div>
                        {type.badge && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeStyles[type.badge]}`}>
                            {type.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
