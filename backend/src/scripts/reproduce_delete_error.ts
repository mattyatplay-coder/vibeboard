import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

async function reproduce() {
  console.log('🧪 Reproducing Generation Deletion Error...');

  // 1. Create Parent Generation
  const parent = await prisma.generation.create({
    data: {
      projectId: PROJECT_ID,
      mode: 'text_to_image',
      inputPrompt: 'Parent Generation',
    },
  });
  console.log(`Created Parent: ${parent.id}`);

  // 2. Create Dependent Generation (Child)
  const child = await prisma.generation.create({
    data: {
      projectId: PROJECT_ID,
      mode: 'image_to_video',
      inputPrompt: 'Child Generation',
      prevGenerationId: parent.id,
    },
  });
  console.log(`Created Child: ${child.id} linked to Parent`);

  // 3. Create Scene and Shot
  const scene = await prisma.scene.create({
    data: {
      projectId: PROJECT_ID,
      name: 'Test Scene',
    },
  });

  const shot = await prisma.sceneShot.create({
    data: {
      sceneId: scene.id,
      generationId: parent.id,
      index: 0,
    },
  });
  console.log(`Created SceneShot linked to Parent`);

  // 4. Attempt Delete Parent
  try {
    await prisma.generation.delete({
      where: { id: parent.id },
    });
    console.log('✅ Delete Successful (Unexpected)');
  } catch (e: any) {
    console.log('❌ Delete Failed (Expected)');
    console.log(`Error Code: ${e.code}`);
    console.log(`Message: ${e.message}`); // Should mention Foreign Key constraint
  }

  // Cleanup
  await prisma.sceneShot.deleteMany({ where: { sceneId: scene.id } }).catch(() => {});
  await prisma.scene.delete({ where: { id: scene.id } }).catch(() => {});
  await prisma.generation.delete({ where: { id: child.id } }).catch(() => {});
  await prisma.generation.delete({ where: { id: parent.id } }).catch(() => {});
}

reproduce()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
