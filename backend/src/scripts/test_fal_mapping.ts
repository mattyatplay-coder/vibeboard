function testMapping(model: string | undefined, image: boolean) {
  let mappedModel = model;
  if (!mappedModel) {
    mappedModel = image ? 'fal-ai/wan-i2v' : 'fal-ai/wan-t2v';
  } else {
    // Map friendly names to Fal endpoints (Robust matching)
    const normalizedModel = mappedModel.toLowerCase().trim();
    if (normalizedModel.includes('wan')) {
      mappedModel = image ? 'fal-ai/wan-i2v' : 'fal-ai/wan-t2v';
    }
  }
  console.log(`Input: "${model}", Image: ${image} -> Output: "${mappedModel}"`);
}

testMapping('wan-2.2', false);
testMapping('wan-2.2', true);
testMapping('wan-2.1', false);
testMapping('wan-2.5', false);
testMapping('wan-2.2 ', false); // Trailing space
testMapping(undefined, false);
