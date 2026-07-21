import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisType, isDuoType, toBaseType } from "@/types/analysis";
import { Brain, Lightbulb, User, Users, Stethoscope, ClipboardList, Zap } from "lucide-react";

interface AnalysisSelectorProps {
  selectedType: AnalysisType;
  onTypeSelect: (type: AnalysisType) => void;
}

const baseDomains = [
  {
    domain: "Cognitive",
    types: [
      { id: 'micro-cognitive' as AnalysisType, title: 'Micro Cognitive', description: 'All 18 questions, razor-sharp answers', icon: Zap, badge: 'micro' },
      { id: 'cognitive' as AnalysisType, title: 'Cognitive', description: 'Basic cognitive assessment with core intelligence metrics', icon: Lightbulb, badge: null },
      { id: 'comprehensive-cognitive' as AnalysisType, title: 'Comprehensive Cognitive', description: 'Full cognitive analysis with exhaustive depth', icon: Brain, badge: 'full' },
    ],
  },
  {
    domain: "Psychological",
    types: [
      { id: 'micro-psychological' as AnalysisType, title: 'Micro Psychological', description: 'All 20 questions, razor-sharp answers', icon: Zap, badge: 'micro' },
      { id: 'psychological' as AnalysisType, title: 'Psychological', description: 'Personality and behavioral assessment', icon: User, badge: null },
      { id: 'comprehensive-psychological' as AnalysisType, title: 'Comprehensive Psychological', description: 'Full psychological profile with exhaustive depth', icon: Users, badge: 'full' },
    ],
  },
  {
    domain: "Psychopathological",
    types: [
      { id: 'micro-psychopathological' as AnalysisType, title: 'Micro Psychopathological', description: 'All 20 questions, razor-sharp answers', icon: Zap, badge: 'micro' },
      { id: 'psychopathological' as AnalysisType, title: 'Psychopathological', description: 'Clinical pathology assessment', icon: Stethoscope, badge: null },
      { id: 'comprehensive-psychopathological' as AnalysisType, title: 'Comprehensive Psychopathological', description: 'Full clinical assessment with exhaustive depth', icon: ClipboardList, badge: 'full' },
    ],
  },
];

const badgeStyles: Record<string, string> = {
  micro: 'bg-amber-100 text-amber-700',
  full: 'bg-purple-100 text-purple-700',
  duo: 'bg-teal-100 text-teal-700',
};

export function AnalysisSelector({ selectedType, onTypeSelect }: AnalysisSelectorProps) {
  const currentlyDuo = isDuoType(selectedType);
  const [duoMode, setDuoMode] = useState<boolean>(currentlyDuo);

  const handleModeToggle = (newDuo: boolean) => {
    setDuoMode(newDuo);
    const base = toBaseType(selectedType);
    const next = newDuo ? (`${base}-duo` as AnalysisType) : base;
    onTypeSelect(next);
  };

  const handleTypeClick = (baseId: AnalysisType) => {
    const next = duoMode ? (`${baseId}-duo` as AnalysisType) : baseId;
    onTypeSelect(next);
  };

  const selectedBase = toBaseType(selectedType);

  return (
    <Card className="border-border-light shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Select Analysis Type</h2>
          <div className="flex items-center rounded-lg border border-border-light overflow-hidden text-sm font-medium">
            <button
              onClick={() => handleModeToggle(false)}
              data-testid="toggle-single-mode"
              className={`px-4 py-1.5 transition-colors ${!duoMode ? 'bg-primary-blue text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Single
            </button>
            <button
              onClick={() => handleModeToggle(true)}
              data-testid="toggle-duo-mode"
              className={`px-4 py-1.5 transition-colors ${duoMode ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Duo
            </button>
          </div>
        </div>

        {duoMode && (
          <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-3 py-2 mb-4">
            Duo mode — upload a dialogue transcript. The app profiles each speaker separately.
          </p>
        )}

        <div className="space-y-4">
          {baseDomains.map((group) => (
            <div key={group.domain}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 pl-1">
                {group.domain}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {group.types.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedBase === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeClick(type.id)}
                      data-testid={`analysis-${type.id}${duoMode ? '-duo' : ''}`}
                      className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? duoMode
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-primary-blue bg-blue-50'
                          : duoMode
                            ? 'border-border-light hover:border-teal-500 hover:bg-teal-50'
                            : 'border-border-light hover:border-primary-blue hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${duoMode ? 'text-teal-600' : 'text-primary-blue'}`} />
                          <h3 className="font-semibold text-sm">{type.title}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          {type.badge && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeStyles[type.badge]}`}>
                              {type.badge}
                            </span>
                          )}
                          {duoMode && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeStyles.duo}`}>
                              duo
                            </span>
                          )}
                        </div>
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
