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
            {WORKFLOW_TEMPLATES.map((template) => (
                <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className={clsx(
                        "flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:bg-white/5",
                        selectedId === template.id
                            ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500"
                            : "bg-black/30 border-white/10"
                    )}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{template.icon}</span>
                        <span className="font-medium text-white">{template.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                        {template.description}
                    </p>
                </button>
            ))}
        </div>
    );
}
