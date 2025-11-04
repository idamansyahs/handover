import { PrismaClient, RoomStatus, RoomType, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
async function main(){
  const adminPwd = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { email: "admin@hotel.com" },
    update: { 
      role: Role.ADMIN // Pastikan role adalah ADMIN jika akun sudah ada
    },
    create: { 
      username: "admin", 
      email: "admin@hotel.com", 
      password: adminPwd,
      role: Role.ADMIN // Set role ke ADMIN saat dibuat
    }
  });

  // 🔹 3. Buat Akun STAFF Baru
  const staffPwd = await bcrypt.hash("staff123", 10); // Password untuk staff
  await prisma.admin.upsert({
    where: { email: "staff@hotel.com" },
    update: {
      role: Role.STAFF // Pastikan role adalah STAFF jika akun sudah ada
    },
    create: { 
      username: "staff", 
      email: "staff@hotel.com", 
      password: staffPwd,
      role: Role.STAFF // Set role ke STAFF saat dibuat
    }
  });

  const rooms = [
    { roomNumber: "201", type: RoomType.FSKG, price: 1077000, status: RoomStatus.OCCUPIED },
    { roomNumber: "202", type: RoomType.FBK, price: 1377000, status: RoomStatus.VCI },
    { roomNumber: "203", type: RoomType.FBK, price: 1377000, status: RoomStatus.VCI },
    { roomNumber: "205", type: RoomType.FSST, price: 1077000, status: RoomStatus.OCCUPIED },
    { roomNumber: "206", type: RoomType.FBK, price: 1377000, status: RoomStatus.VCI },
    { roomNumber: "207", type: RoomType.DXQ, price: 877000, status: RoomStatus.OCCUPIED },
    { roomNumber: "208", type: RoomType.DXQ, price: 877000, status: RoomStatus.VCN },
    { roomNumber: "209", type: RoomType.FSKG, price: 1077000, status: RoomStatus.VCI },
    { roomNumber: "210", type: RoomType.FSKG, price: 1077000, status: RoomStatus.VCI },
    { roomNumber: "211", type: RoomType.FSKG, price: 1077000, status: RoomStatus.VCI },
    { roomNumber: "212", type: RoomType.FSKG, price: 1077000, status: RoomStatus.VDN },
    { roomNumber: "215", type: RoomType.FSST, price: 1077000, status: RoomStatus.VCI },

    { roomNumber: "301", type: RoomType.FSKG, price: 1077000, status: RoomStatus.VCI },
    { roomNumber: "302", type: RoomType.FBK, price: 1377000, status: RoomStatus.VCI },
    { roomNumber: "303", type: RoomType.FSKG, price: 1077000, status: RoomStatus.VDN },
    { roomNumber: "305", type: RoomType.FBK, price: 1377000, status: RoomStatus.VDN },
    { roomNumber: "306", type: RoomType.FSST, price: 1077000, status: RoomStatus.VCI },
    { roomNumber: "307", type: RoomType.FSST, price: 1077000, status: RoomStatus.VCI },
    { roomNumber: "308", type: RoomType.FSST, price: 1077000, status: RoomStatus.OOO },
    { roomNumber: "309", type: RoomType.FBK, price: 1377000, status: RoomStatus.OOO },
    { roomNumber: "310", type: RoomType.FSKG, price: 1077000, status: RoomStatus.OOO },
    { roomNumber: "311", type: RoomType.FBK, price: 1377000, status: RoomStatus.OOO },
    { roomNumber: "312", type: RoomType.FSKG, price: 1077000, status: RoomStatus.OOO },
    { roomNumber: "315", type: RoomType.FSST, price: 1077000, status: RoomStatus.VCI },
  ];
  for (const r of rooms){
    await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {},
      create: r
    });
  }
}
main().finally(()=>prisma.$disconnect());
