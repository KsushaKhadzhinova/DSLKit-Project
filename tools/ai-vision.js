// The part of the AI endpoint that reads PICTURES and PDF: the extra file types, the prompt for the recognition and the checks of the answer.
// The code of the answer is still validated by the parser of DSLKit in ai-api.js; here are the checks that only make sense for a recognised picture.

export const VISION_TYPES = { 'application/pdf': 'pdf' };
export const VISION_SIGNATURES = {
  'application/pdf': (bytes) => bytes.length > 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-',
};

// The block of the request for a picture or a PDF document.
export const visionBlock = (mediaType, data) =>
  mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mediaType, data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

// The task for the recognition: the steps are the same for every picture, so the answer does not depend on the mood of the model.
export const VISION_TASK = [
  'Recognise the diagram in the attached picture (or the first diagram of the PDF) and rebuild it as DSLKit code.',
  'Work in this order:',
  '1. Decide the kind of the diagram (flowchart, BPMN, UML class or sequence, ER, DFD, state, graph, mind map, org chart, network). Choose the closest DSLKit notation from the list; use `graph` or `gost` when unsure.',
  '2. List every element with its exact text from the picture, and every arrow with its direction and its label. Do not invent elements that are not drawn and do not drop drawn ones.',
  '3. Map each shape to the keyword of the notation: an oval to start or end, a rhombus to a decision or a gateway, a rectangle to a process or a task, a parallelogram to input or output, a cylinder to a store.',
  '4. For flow notations that accept it, add `pos=XxY` (the centre of the block in pixels of the picture, whole numbers) to keep the layout.',
  '5. Give every block a short unique identifier and write the text of the block as its label.',
  'If the picture is not a diagram, answer with the header of the `graph` notation and a single vertex named "unrecognised". Answer with the code only.',
].join('\n');

// Extra problems of a recognised picture. `result` is { code, notation, errors }; the answer is a list of { line, message }.
export const visionIssues = (result, mode) => {
  if (mode !== 'image') return [];
  const lines = result.code.split(/\r?\n/).filter((line) => line.trim() !== '' && !line.trim().startsWith('//'));
  if (lines.length === 0 || !/^diagram\s/.test(lines[0]))
    return [{ line: 1, severity: 'error', message: 'The answer must start with the header `diagram <notation>`, without any text before it' }];
  if (lines.length < 2) return [{ line: 1, severity: 'error', message: 'The diagram has no elements: read the picture again and list every element' }];
  return [];
};

// The message that returns the problems to the model.
export const retryMessage = (errors, mode) =>
  [
    'The code has errors. Fix them and answer with the whole corrected DSLKit code only.',
    ...errors.map((item) => `line ${item.line}: ${item.message}`),
    ...(mode === 'image' ? ['Look at the picture again: keep the elements and the arrows you already read, change only what the errors name.'] : []),
  ].join('\n');
