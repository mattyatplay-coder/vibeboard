import React from 'react';
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '../../data/workflowTemplates';
import { clsx } from 'clsx';

interface TemplateSelectorProps {
  onSelect: (template: WorkflowTemplate) => void;
  selectedId?: string;
}

export function TemplateSelector({ onSelect, selectedId }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {WORKFLOW_TEMPLATES.map(template => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className={clsx(
            'flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:bg-white/5',
            selectedId === template.id
              ? 'border-blue-500 bg-blue-600/20 ring-1 ring-blue-500'
              : 'border-white/10 bg-black/30'
          )}
        >
          <div className="mb-2 flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <span className="font-medium text-white">{template.name}</span>
          </div>
          <p className="line-clamp-2 text-xs text-gray-400">{template.description}</p>
        </button>
      ))}
    </div>
  );
}
