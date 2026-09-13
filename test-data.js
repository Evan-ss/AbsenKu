const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Check data
  const guru = await prisma.user.findUnique({ where: { email: 'guru@sekolah.com' } });
  console.log('Guru:', guru?.id, guru?.nama);
  
  const kelas = await prisma.kelas.findMany({ take: 2 });
  console.log('Kelas:', kelas.map(k => ({ id: k.id, nama: k.namaKelas, wali: k.waliKelas })));
  
  const guruKelas = await prisma.guruKelas.findMany({ where: { guruId: guru.id } });
  console.log('GuruKelas:', guruKelas);
  
  const siswa = await prisma.user.findMany({ where: { role: 'SISWA', kelasId: kelas[0]?.id } });
  console.log('Siswa di kelas 1:', siswa.map(s => ({ id: s.id, nama: s.nama, kelasId: s.kelasId })));
  
  await prisma.$disconnect();
}
test().catch(console.error);