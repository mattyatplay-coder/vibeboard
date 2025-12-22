import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

async function verify() {
  console.log('🧪 Verifying Safe Generation Deletion...');

  // 1. Setup Data (Same as before)
  const parent = await prisma.generation.create({
    data: { projectId: PROJECT_ID, mode: 'text_to_image', inputPrompt: 'Parent Gen' },
  });
  const child = await prisma.generation.create({
    data: {
      projectId: PROJECT_ID,
      mode: 'image_to_video',
      inputPrompt: 'Child Gen',
      prevGenerationId: parent.id,
    },
  });
  const scene = await prisma.scene.create({ data: { projectId: PROJECT_ID, name: 'Test Scene' } });
  const shot = await prisma.sceneShot.create({
    data: { sceneId: scene.id, generationId: parent.id, index: 0 },
  });
  console.log(`Setup complete. Parent: ${parent.id}, Child: ${child.id}`);

  // 2. Execute Deletion Logic (Mirroring Controller)
  console.log('Attempting Transactional Delete...');
  try {
    await prisma.$transaction(async tx => {
      // 1. Remove references in SceneShot
      const delShots = await tx.sceneShot.deleteMany({
        where: { generationId: parent.id },
      });
      console.log(`Deleted ${delShots.count} SceneShots.`);

      // 2. Unlink any child generations
      const unlink = await tx.generation.updateMany({
        where: { prevGenerationId: parent.id },
        data: { prevGenerationId: null },
      });
      console.log(`Unlinked ${unlink.count} child generations.`);

      // 3. Delete the generation itself
      await tx.generation.delete({
        where: { id: parent.id, projectId: PROJECT_ID },
      });
      console.log('Deleted Generation record.');
    });

    console.log('✅ SUCCESS: Deletion completed without error.');
  } catch (e: any) {
    console.error('❌ FAILURE: Deletion failed.');
    console.error(e);
    process.exit(1);
  }

  // 3. Verify State
  const checkParent = await prisma.generation.findUnique({ where: { id: parent.id } });
  if (checkParent) {
    console.error('❌ FAILURE: Parent generation still exists.');
    process.exit(1);
  } else {
    console.log('✅ Verified: Parent generation is gone.');
  }

  const checkChild = await prisma.generation.findUnique({ where: { id: child.id } });
  if (checkChild && checkChild.prevGenerationId === null) {
    console.log('✅ Verified: Child generation exists unlinked.');
  } else {
    console.error('❌ FAILURE: Child generation state incorrect.', checkChild);
    process.exit(1);
  }

  // Cleanup
  await prisma.generation.delete({ where: { id: child.id } }).catch(() => {});
  await prisma.scene.delete({ where: { id: scene.id } }).catch(() => {});
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
