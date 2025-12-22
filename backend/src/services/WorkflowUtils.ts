import { GenerationOptions } from './generators/GenerationProvider';

export interface WorkflowMapping {
  positive?: { nodeId: string; inputId?: string };
  negative?: { nodeId: string; inputId?: string };
  image?: { nodeId: string; inputId?: string };
  seed?: { nodeId: string; inputId?: string };
  steps?: { nodeId: string; inputId?: string };
  cfg?: { nodeId: string; inputId?: string };
}

export function applyWorkflowMapping(
  workflowJson: any,
  map: WorkflowMapping,
  options: GenerationOptions,
  imageValue?: string
): any {
  const workflow = JSON.parse(JSON.stringify(workflowJson)); // Deep copy

  if (!map) return workflow;

  // Apply mappings
  if (map.positive && workflow[map.positive.nodeId]) {
    workflow[map.positive.nodeId].inputs[map.positive.inputId || 'text'] = options.prompt;
  }
  if (map.negative && workflow[map.negative.nodeId]) {
    workflow[map.negative.nodeId].inputs[map.negative.inputId || 'text'] =
      options.negativePrompt || '';
  }
  if (map.seed && workflow[map.seed.nodeId]) {
    workflow[map.seed.nodeId].inputs[map.seed.inputId || 'seed'] =
      options.seed || Math.floor(Math.random() * 1000000000);
  }
  if (map.steps && workflow[map.steps.nodeId]) {
    workflow[map.steps.nodeId].inputs[map.steps.inputId || 'steps'] = options.steps || 20;
  }
  if (map.cfg && workflow[map.cfg.nodeId]) {
    workflow[map.cfg.nodeId].inputs[map.cfg.inputId || 'cfg'] = options.guidanceScale || 7.0;
  }

  // Handle Image Input
  if (imageValue && map.image && workflow[map.image.nodeId]) {
    workflow[map.image.nodeId].inputs[map.image.inputId || 'image'] = imageValue;
  }

  return workflow;
}
