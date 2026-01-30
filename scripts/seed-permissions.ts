import { PrismaClient, Role } from '@prisma/client';
import { DEFAULT_EMPLOYER_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS } from '../src/auth/permissions';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting permission seeding...');

    try {
        // 1. Update Employers
        const employers = await prisma.userCompany.updateMany({
            where: {
                role: Role.EMPLOYER,
            },
            data: {
                permissions: DEFAULT_EMPLOYER_PERMISSIONS,
            },
        });
        console.log(`✅ Updated ${employers.count} Employer memberships.`);

        // 2. Update Employees (Optional but good for consistency)
        const employees = await prisma.userCompany.updateMany({
            where: {
                role: Role.EMPLOYEE,
            },
            data: {
                permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
            },
        });
        console.log(`✅ Updated ${employees.count} Employee memberships.`);

        console.log('✨ Permission seeding complete!');
    } catch (error) {
        console.error('❌ Error seeding permissions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
