import { Card, CardContent } from "@/components/ui/card";
import { AnalysisType } from "@/types/analysis";
import { Brain, Lightbulb, User, Users, Stethoscope, ClipboardList } from "lucide-react";

interface AnalysisSelectorProps {
  selectedType: AnalysisType;
  onTypeSelect: (type: AnalysisType) => void;
}

const analysisTypes = [
  {
    id: 'cognitive' as AnalysisType,
    title: 'Cognitive',
    description: 'Basic cognitive assessment with core intelligence metrics',
    icon: Lightbulb,
  },
  {
    id: 'comprehensive-cognitive' as AnalysisType,
    title: 'Comprehensive Cognitive',
    description: 'Four-phase detailed cognitive analysis',
    icon: Brain,
  },
  {
    id: 'psychological' as AnalysisType,
    title: 'Psychological',
    description: 'Personality and behavioral assessment',
    icon: User,
  },
  {
    id: 'comprehensive-psychological' as AnalysisType,
    title: 'Comprehensive Psychological',
    description: 'Multi-phase psychological profiling',
    icon: Users,
  },
  {
    id: 'psychopathological' as AnalysisType,
    title: 'Psychopathological',
    description: 'Clinical pathology assessment',
    icon: Stethoscope,
  },
  {
    id: 'comprehensive-psychopathological' as AnalysisType,
    title: 'Comprehensive Psychopathological',
    description: 'Detailed clinical assessment protocol',
    icon: ClipboardList,
  },
];

export function AnalysisSelector({ selectedType, onTypeSelect }: AnalysisSelectorProps) {
  return (
    <Card className="border-border-light shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Select Analysis Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisTypes.map((type) => {
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
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className="h-5 w-5 text-primary-blue" />
                  <h3 className="font-semibold">{type.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
