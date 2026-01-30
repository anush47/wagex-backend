"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const permissions_1 = require("../src/auth/permissions");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🚀 Starting permission seeding...');
    try {
        const employers = await prisma.userCompany.updateMany({
            where: {
                role: client_1.Role.EMPLOYER,
            },
            data: {
                permissions: permissions_1.DEFAULT_EMPLOYER_PERMISSIONS,
            },
        });
        console.log(`✅ Updated ${employers.count} Employer memberships.`);
        const employees = await prisma.userCompany.updateMany({
            where: {
                role: client_1.Role.EMPLOYEE,
            },
            data: {
                permissions: permissions_1.DEFAULT_EMPLOYEE_PERMISSIONS,
            },
        });
        console.log(`✅ Updated ${employees.count} Employee memberships.`);
        console.log('✨ Permission seeding complete!');
    }
    catch (error) {
        console.error('❌ Error seeding permissions:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=seed-permissions.js.map