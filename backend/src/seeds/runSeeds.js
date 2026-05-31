const { AppDataSource } = require('../config/data-source');
const { seedQuestions } = require('./seedQuestions');
const { seedCars } = require('./seedCars');

async function runSeeds() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Database connected. Running seeds...\n');

    await seedQuestions();
    await seedCars();

    console.log('\n🎉 All seeds completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

runSeeds();
